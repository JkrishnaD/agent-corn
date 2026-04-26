// Core agent loop. Wires monitor → LLM reasoning → executor → events bus.

import { randomUUID } from "node:crypto";
import type { Rule, AgentEvent } from "@agent-corn/shared";
import { PollingMonitor, type TriggerCandidate } from "./monitor.js";
import { reasonAboutTrigger } from "./llm.js";
import { executeAction } from "./executor.js";
import { recordDecisionOnEr } from "./program.js";

type Listener = (e: AgentEvent) => void;

export class AgentLoop {
  private rules: Map<string, Rule> = new Map();
  private monitor = new PollingMonitor();
  private listeners: Set<Listener> = new Set();
  private running = false;
  private paused = false;

  on(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  emit(
    partial: Partial<AgentEvent> & { ruleId: string; type: AgentEvent["type"] }
  ) {
    const evt: AgentEvent = {
      id: randomUUID(),
      ts: Date.now(),
      payload: {},
      ...partial,
    };
    for (const l of this.listeners) l(evt);
  }

  addRule(r: Rule) {
    this.rules.set(r.id, r);
  }

  removeRule(id: string) {
    this.rules.delete(id);
  }

  setEnabled(id: string, enabled: boolean): Rule | null {
    const r = this.rules.get(id);
    if (!r) return null;
    r.enabled = enabled;
    this.rules.set(id, r);
    return r;
  }

  listRules(): Rule[] {
    return [...this.rules.values()];
  }

  isPaused(): boolean {
    return this.paused;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    // Monitor only sees rules when not paused — the rules getter returns []
    // while paused, so no triggers fire and no LLM calls run.
    await this.monitor.start(() => (this.paused ? [] : [...this.rules.values()]), {
      onTrigger: (c) => this.handleTrigger(c),
      onCheck: (e) => this.emit(e),
    });
  }

  async stop() {
    this.running = false;
    await this.monitor.stop();
  }

  private async handleTrigger(c: TriggerCandidate) {
    const { rule, event } = c;
    this.emit({ ruleId: rule.id, type: "trigger_fired", payload: event });
    this.emit({ ruleId: rule.id, type: "reasoning_started", payload: {} });

    let decision;
    try {
      decision = await reasonAboutTrigger({
        rulePrompt: rule.reasoningPrompt,
        triggerEvent: event,
        context: { now: Date.now(), action: rule.action },
      });
    } catch (err) {
      this.emit({
        ruleId: rule.id,
        type: "error",
        payload: { kind: "llm_failed", msg: String(err) },
      });
      return;
    }

    this.emit({
      ruleId: rule.id,
      type: "reasoning_decision",
      reasoning: decision.reasoning,
      payload: { ...decision },
    });

    // Record decision on-chain via Magic Router (runs on ER, sub-50ms).
    // Fires for every decision — both fired and skipped — so the on-chain
    // counter reflects every LLM call, not just successful actions.
    recordDecisionOnEr({
      ruleId: rule.id,
      confidence: decision.confidence,
      executed: decision.shouldExecute,
      reasoningText: decision.reasoning,
    })
      .then((r) =>
        this.emit({
          ruleId: rule.id,
          type: "action_settled",
          txSignature: r.erSig,
          payload: {
            kind: "record_decision",
            route: "magicblock",
            pda: r.pda,
            commitmentSig: r.commitmentSig,
            durationMs: r.durationMs,
          },
        })
      )
      .catch((e) =>
        this.emit({
          ruleId: rule.id,
          type: "error",
          payload: { kind: "record_decision_failed", msg: String(e) },
        })
      );

    if (!decision.shouldExecute) return;

    this.emit({ ruleId: rule.id, type: "action_delegating", payload: {} });
    this.emit({ ruleId: rule.id, type: "action_executing", payload: {} });

    const result = await executeAction(rule);
    this.emit({
      ruleId: rule.id,
      type: result.type ?? "action_settled",
      payload: result.payload ?? {},
      txSignature: result.txSignature,
    });
  }
}
