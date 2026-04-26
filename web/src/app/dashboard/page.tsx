"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Wallet adapter button hydrates differently on client (icon + label) than
// the placeholder Next.js renders on the server. Mount client-only.
const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);
import type { Rule, AgentEvent, AgentStatus } from "@agent-corn/shared";
import {
  listRules,
  deleteRule,
  toggleRule,
  subscribeEvents,
  getStatus,
  pauseAgent,
  resumeAgent,
} from "@/lib/api";
import { RuleBuilder } from "@/components/rule-builder";
import { EventTimeline } from "@/components/event-timeline";

export default function Dashboard() {
  const { publicKey } = useWallet();
  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    listRules()
      .then(setRules)
      .catch(() => {});
    getStatus()
      .then(setStatus)
      .catch(() => {});
    const unsub = subscribeEvents(
      (e) => setEvents((prev) => [e, ...prev].slice(0, 200)),
      (snapshot) => setEvents(snapshot)
    );
    // Poll status every 3s to keep paused flag fresh in case multiple
    // dashboard tabs toggle it.
    const t = setInterval(
      () => getStatus().then(setStatus).catch(() => {}),
      3000
    );
    return () => {
      unsub();
      clearInterval(t);
    };
  }, []);

  const handleToggleAgent = useCallback(async () => {
    if (!status) return;
    setPausing(true);
    try {
      const r = status.paused ? await resumeAgent() : await pauseAgent();
      setStatus({ ...status, paused: r.paused });
    } finally {
      setPausing(false);
    }
  }, [status]);

  const handleCreated = useCallback((r: Rule) => {
    setRules((prev) => [r, ...prev]);
    setShowBuilder(false);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    const updated = await toggleRule(id, enabled);
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-ice/90 relative">
      <div aria-hidden="true" className="fixed inset-0 bg-halftone opacity-20 pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-line backdrop-blur-2xl bg-bg/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-brand-fade flex items-center justify-center text-bg font-bold text-sm shadow-[0_0_18px_rgba(73,136,196,0.5)]">
                ▲
              </span>
              <span className="font-mono font-semibold text-sm text-ice">
                agent<span className="text-sky">cron</span>
              </span>
            </Link>
            <span className="h-4 w-px bg-line" />
            <span className="font-mono text-xs text-ice/50 tracking-wider uppercase">
              dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/config"
              className="hidden sm:inline-flex font-mono text-[11px] tracking-wider uppercase text-ice/50 hover:text-ice px-3 py-1.5 rounded-full transition-colors"
            >
              config
            </Link>
            {status && (
              <button
                onClick={handleToggleAgent}
                disabled={pausing}
                title={status.paused ? "resume agent" : "pause agent"}
                className={`group hidden sm:flex items-center gap-2 backdrop-blur-md rounded-full px-3.5 py-1.5 border transition-all disabled:opacity-50 ${
                  status.paused
                    ? "border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/15"
                    : "border-line bg-panel/40 hover:border-edge hover:bg-panel/60"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {!status.paused && status.running && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-70" />
                  )}
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                      status.paused
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                        : status.running
                        ? "bg-sky shadow-[0_0_8px_rgba(73,136,196,0.9)]"
                        : "bg-ice/20"
                    }`}
                  />
                </span>
                <span
                  className={`font-mono text-[10px] tracking-[0.2em] uppercase ${
                    status.paused ? "text-amber-300" : "text-ice/60"
                  }`}
                >
                  {pausing
                    ? "…"
                    : status.paused
                    ? "paused · resume"
                    : "live · pause"}
                </span>
              </button>
            )}
            <WalletMultiButton
              style={{
                background: "rgba(189,232,245,0.04)",
                border: "1px solid rgba(189,232,245,0.12)",
                color: "#BDE8F5",
                borderRadius: "10px",
                fontSize: "12px",
                padding: "8px 14px",
                height: "auto",
                lineHeight: 1.2,
              }}
            />
          </div>
        </div>
      </nav>

      {!publicKey ? (
        <div className="relative flex items-center justify-center min-h-[calc(100vh-64px)] px-6">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] glow-orb opacity-60 animate-glow-pulse pointer-events-none" />
          <div className="relative text-center max-w-md mx-auto gradient-border rounded-3xl bg-panel/60 backdrop-blur-xl p-12">
            <div className="w-14 h-14 rounded-2xl bg-brand-fade flex items-center justify-center mx-auto mb-6 shadow-[0_0_28px_rgba(73,136,196,0.5)]">
              <span className="text-bg font-bold text-xl">▲</span>
            </div>
            <h2 className="font-display text-3xl text-ice mb-3 leading-tight">
              Connect your <em className="italic text-brand-gradient">wallet</em>
            </h2>
            <p className="font-sans text-sm text-ice/55 leading-relaxed mb-8">
              Connect a Solana wallet to manage your autonomous agent rules.
            </p>
            <WalletMultiButton
              style={{
                background: "linear-gradient(135deg,#4988C4 0%,#BDE8F5 100%)",
                color: "#040814",
                fontWeight: 600,
                fontSize: "13px",
                padding: "12px 24px",
                borderRadius: "999px",
                height: "auto",
                lineHeight: 1.2,
                boxShadow:
                  "0 8px 32px -8px rgba(73,136,196,0.6), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="relative max-w-7xl mx-auto px-6 py-10">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] text-ice/40 tracking-[0.25em] uppercase">
                workspace
              </span>
              <span className="w-8 h-px bg-edge" />
              <span className="font-mono text-[10px] text-sky tracking-wider truncate max-w-[180px]">
                {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.02em]">
              <span className="text-ice-gradient">Your </span>
              <em className="font-display italic text-brand-gradient">agents</em>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <StatCard
              label="active rules"
              value={String(rules.filter((r) => r.enabled).length)}
              sub={`${rules.length} total`}
              accent
            />
            <StatCard
              label="events logged"
              value={String(events.length)}
              sub="this session"
            />
            <StatCard
              label="settled txns"
              value={String(
                events.filter((e) => e.type === "action_settled").length
              )}
              sub="onchain"
            />
          </div>

          <div className="grid lg:grid-cols-[1fr_400px] gap-5 items-start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl text-ice leading-tight">
                    your rules
                  </h2>
                  <p className="font-mono text-[10px] text-ice/40 mt-1 tracking-[0.2em] uppercase">
                    autonomous onchain agents
                  </p>
                </div>
                <button
                  onClick={() => setShowBuilder((v) => !v)}
                  className={
                    showBuilder
                      ? "btn-ghost inline-flex items-center gap-2 font-mono font-semibold text-xs px-4 py-2.5 rounded-full"
                      : "btn-primary inline-flex items-center gap-2 font-mono font-semibold text-xs px-4 py-2.5 rounded-full"
                  }
                >
                  {showBuilder ? "cancel" : "+ new rule"}
                </button>
              </div>

              {showBuilder && (
                <div className="gradient-border rounded-2xl overflow-hidden bg-panel/60 backdrop-blur-md">
                  <div className="px-5 py-3 border-b border-line flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky shadow-[0_0_8px_rgba(73,136,196,0.8)]" />
                    <span className="font-mono text-[10px] text-sky tracking-[0.25em] uppercase">
                      new rule
                    </span>
                  </div>
                  <div className="p-5">
                    <RuleBuilder onCreated={handleCreated} />
                  </div>
                </div>
              )}

              {rules.length === 0 && !showBuilder ? (
                <div className="rounded-2xl border border-dashed border-edge p-14 text-center bg-panel/20">
                  <div className="w-12 h-12 rounded-xl bg-sky/10 border border-sky/20 flex items-center justify-center mx-auto mb-5">
                    <span className="text-sky text-lg">∅</span>
                  </div>
                  <div className="font-display text-xl text-ice mb-2">
                    No rules deployed yet
                  </div>
                  <p className="font-sans text-sm text-ice/50 mb-6 max-w-xs mx-auto">
                    Write your first rule in plain English and let the agent
                    take over.
                  </p>
                  <button
                    onClick={() => setShowBuilder(true)}
                    className="btn-primary inline-flex items-center gap-2 font-mono font-semibold text-xs px-5 py-2.5 rounded-full"
                  >
                    deploy first rule →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl overflow-hidden bg-panel/60 backdrop-blur-md border border-line">
                <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-bg/40">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky shadow-[0_0_8px_rgba(73,136,196,0.9)]" />
                    </span>
                    <span className="font-mono text-[10px] text-ice/60 tracking-[0.25em] uppercase">
                      event timeline
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-ice/40">
                    {events.length} events
                  </span>
                </div>
                <EventTimeline events={events} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 overflow-hidden ${
        accent
          ? "gradient-border bg-panel/60 backdrop-blur-md"
          : "border border-line bg-panel/40"
      }`}
    >
      {accent && (
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-12 w-44 h-44 glow-orb opacity-60"
        />
      )}
      <div className="relative">
        <div className="font-mono text-[10px] text-ice/40 tracking-[0.25em] uppercase mb-3">
          {label}
        </div>
        <div
          className={`font-display text-5xl leading-none mb-2 ${
            accent ? "text-brand-gradient" : "text-ice"
          }`}
        >
          {value}
        </div>
        <div className="font-mono text-[10px] text-ice/40 tracking-wider">
          {sub}
        </div>
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  onDelete,
  onToggle,
}: {
  rule: Rule;
  onDelete: (id: string) => void;
  onToggle: (id: string, e: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden transition-all ${
        rule.enabled
          ? "border border-edge bg-panel/50 backdrop-blur-md hover:bg-panel/70"
          : "border border-line bg-panel/20"
      }`}
    >
      {rule.enabled && (
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky/50 to-transparent" />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                rule.enabled
                  ? "bg-sky shadow-[0_0_8px_rgba(73,136,196,0.8)]"
                  : "bg-ice/15"
              }`}
            />
            <span className="font-sans text-base font-semibold text-ice truncate">
              {rule.name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={toggling}
              title={rule.enabled ? "pause this rule" : "resume this rule"}
              onClick={async () => {
                setToggling(true);
                onToggle(rule.id, !rule.enabled);
                setToggling(false);
              }}
              className={`font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 ${
                rule.enabled
                  ? "text-sky border-sky/30 bg-sky/10 hover:bg-sky/15"
                  : "text-amber-300 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/15"
              }`}
            >
              {toggling
                ? "…"
                : rule.enabled
                ? "live · pause"
                : "paused · resume"}
            </button>
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                onDelete(rule.id);
              }}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/40 hover:text-red-400 transition-colors px-2 py-1.5"
            >
              {deleting ? "…" : "delete"}
            </button>
          </div>
        </div>

        <p className="font-display italic text-base text-ice/70 leading-snug mb-4 ml-5">
          &ldquo;{rule.reasoningPrompt}&rdquo;
        </p>

        <div className="ml-5 flex flex-wrap gap-2">
          <Tag
            label="watch"
            value={String(rule.trigger.params.address ?? "").slice(0, 8) + "…"}
          />
          <Tag label="type" value={rule.trigger.type} />
          <Tag label="action" value={rule.action.type} />
          {rule.action.params.amountSol !== undefined && (
            <Tag
              label="amount"
              value={`${String(rule.action.params.amountSol)} SOL`}
              accent
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
        accent
          ? "border-sky/30 bg-sky/10"
          : "border-line bg-bg/40"
      }`}
    >
      <span className="font-mono text-[9px] text-ice/40 uppercase tracking-[0.2em]">
        {label}
      </span>
      <span
        className={`font-mono text-[10px] font-semibold ${
          accent ? "text-sky" : "text-ice/70"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
