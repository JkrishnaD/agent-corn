// Polling chain monitor.
//
// Reads live rule list each tick via a provider callback, so rules added
// after start() are picked up immediately.
// Emits both trigger candidates (when condition met) and heartbeat/error
// events (so the dashboard timeline always shows monitor activity).

import { Connection, PublicKey } from "@solana/web3.js";
import type { Rule, AgentEvent } from "@agent-corn/shared";
import { getConnection } from "./wallet.js";

export type TriggerCandidate = {
  ruleId: string;
  rule: Rule;
  event: Record<string, unknown>;
};

export type MonitorHooks = {
  onTrigger: (c: TriggerCandidate) => void;
  onCheck: (
    e: Partial<AgentEvent> & { ruleId: string; type: AgentEvent["type"] }
  ) => void;
};

export interface Monitor {
  start(getRules: () => Rule[], hooks: MonitorHooks): Promise<void>;
  stop(): Promise<void>;
}

export class PollingMonitor implements Monitor {
  private timer: NodeJS.Timeout | null = null;
  private conn: Connection = getConnection();

  async start(getRules: () => Rule[], hooks: MonitorHooks) {
    this.timer = setInterval(async () => {
      for (const r of getRules()) {
        if (!r.enabled) continue;
        await this.evaluateRule(r, hooks);
      }
    }, 5_000);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async evaluateRule(r: Rule, hooks: MonitorHooks) {
    if (r.trigger.type !== "balance") {
      hooks.onCheck({
        ruleId: r.id,
        type: "monitor_check",
        payload: {
          kind: "skipped",
          reason: `unsupported trigger: ${r.trigger.type}`,
        },
      });
      return;
    }

    const addr = r.trigger.params.address as string;
    const threshold = r.trigger.params.lamportsBelow as number;

    try {
      const bal = await this.conn.getBalance(new PublicKey(addr));
      const triggered = bal < threshold;

      hooks.onCheck({
        ruleId: r.id,
        type: "monitor_check",
        payload: {
          address: addr,
          balanceLamports: bal,
          balanceSol: bal / 1_000_000_000,
          thresholdLamports: threshold,
          thresholdSol: threshold / 1_000_000_000,
          triggered,
        },
      });

      if (triggered) {
        hooks.onTrigger({
          ruleId: r.id,
          rule: r,
          event: { kind: "balance", address: addr, balance: bal, threshold },
        });
      }
    } catch (e) {
      hooks.onCheck({
        ruleId: r.id,
        type: "error",
        payload: {
          kind: "monitor_check_failed",
          address: addr,
          msg: String(e),
        },
      });
    }
  }
}
