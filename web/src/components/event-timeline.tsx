"use client";

import { useState } from "react";
import type { AgentEvent } from "@agent-corn/shared";

const colors: Record<AgentEvent["type"], string> = {
  monitor_check: "text-ice/40",
  trigger_fired: "text-yellow-400",
  reasoning_started: "text-sky",
  reasoning_decision: "text-ice",
  action_delegating: "text-cyan-300",
  action_executing: "text-orange-300",
  action_settled: "text-emerald-300",
  error: "text-red-400",
};

const dots: Record<AgentEvent["type"], string> = {
  monitor_check: "bg-ice/30",
  trigger_fired: "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]",
  reasoning_started: "bg-sky shadow-[0_0_8px_rgba(73,136,196,0.7)]",
  reasoning_decision: "bg-ice shadow-[0_0_8px_rgba(189,232,245,0.7)]",
  action_delegating: "bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.7)]",
  action_executing: "bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.7)]",
  action_settled: "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]",
  error: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]",
};

const labels: Record<AgentEvent["type"], string> = {
  monitor_check: "check",
  trigger_fired: "trigger fired",
  reasoning_started: "reasoning",
  reasoning_decision: "decision",
  action_delegating: "delegating",
  action_executing: "executing",
  action_settled: "settled",
  error: "error",
};

export function EventTimeline({ events }: { events: AgentEvent[] }) {
  const [showChecks, setShowChecks] = useState(true);
  const filtered = showChecks
    ? events
    : events.filter((e) => e.type !== "monitor_check");

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-bg/30">
        <span className="font-mono text-[10px] text-ice/50 tracking-wider">
          {filtered.length}
          {!showChecks &&
            events.length !== filtered.length &&
            ` / ${events.length}`}
        </span>
        <label className="font-mono text-[10px] text-ice/50 flex items-center gap-2 cursor-pointer hover:text-ice/80 transition-colors">
          <input
            type="checkbox"
            checked={showChecks}
            onChange={(e) => setShowChecks(e.target.checked)}
            className="accent-sky w-3 h-3"
          />
          show checks
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <div className="font-display italic text-base text-ice/50 leading-snug">
            no events yet
          </div>
          <div className="font-mono text-[10px] text-ice/30 mt-2 tracking-wider">
            deploy a rule — agent polls every 5s
          </div>
        </div>
      ) : (
        <div className="max-h-[640px] overflow-y-auto">
          {[...filtered].reverse().map((e) => (
            <div
              key={e.id}
              className="px-4 py-3 border-b border-line/50 hover:bg-bg/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[e.type]}`}
                  />
                  <span
                    className={`font-mono text-[11px] tracking-wider ${colors[e.type]}`}
                  >
                    {labels[e.type]}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-ice/30 shrink-0">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
              </div>
              <div className="ml-4">{renderPayload(e)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderPayload(e: AgentEvent) {
  if (e.reasoning) {
    return (
      <div className="font-display italic text-sm text-ice/70 leading-snug mt-1">
        &ldquo;{e.reasoning}&rdquo;
      </div>
    );
  }

  if (e.type === "monitor_check") {
    const p = e.payload as Record<string, unknown>;
    if (p.kind === "skipped") {
      return (
        <div className="font-mono text-[10px] text-ice/40">
          skipped: {String(p.reason)}
        </div>
      );
    }
    const balSol = (p.balanceSol as number)?.toFixed(4);
    const thrSol = (p.thresholdSol as number)?.toFixed(4);
    const triggered = p.triggered as boolean;
    return (
      <div className="font-mono text-[10px] text-ice/50">
        bal <span className="text-ice/80">{balSol}</span> · thr {thrSol} ·
        <span
          className={triggered ? " text-yellow-400" : " text-ice/40"}
        >
          {triggered ? " will fire" : " no action"}
        </span>
      </div>
    );
  }

  if (e.type === "error") {
    const p = e.payload as Record<string, unknown>;
    return (
      <div className="font-mono text-[10px] text-red-400">
        {String(p.msg ?? p.kind ?? "error")}
      </div>
    );
  }

  if (e.txSignature) {
    return (
      <a
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[10px] text-sky hover:text-ice transition-colors inline-flex items-center gap-1"
        href={`https://solscan.io/tx/${e.txSignature}?cluster=devnet`}
      >
        {e.txSignature.slice(0, 16)}…
        <span aria-hidden="true">↗</span>
      </a>
    );
  }

  return null;
}
