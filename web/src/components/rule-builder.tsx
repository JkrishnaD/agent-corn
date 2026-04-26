"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import type { Rule } from "@agent-corn/shared";
import { createRule, getStatus } from "@/lib/api";

function isValidPubkey(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

type Template = {
  id: string;
  label: string;
  blurb: string;
  build: (ctx: { agent: string; user: string }) => {
    name: string;
    reasoning: string;
    watchAddress: string;
    thresholdSol: string;
    actionTo: string;
    actionAmount: string;
  };
};

const TEMPLATES: Template[] = [
  {
    id: "auto-topup",
    label: "auto top-up",
    blurb: "watch your wallet, top up if low",
    build: ({ user }) => ({
      name: "auto top-up",
      reasoning:
        "If the watched wallet's balance is genuinely low (not just a temporary 1-second dip during a tx), top it up by sending 0.01 SOL. Be conservative — only fire if balance has been below threshold for a real reason.",
      watchAddress: user,
      thresholdSol: "0.5",
      actionTo: user,
      actionAmount: "0.01",
    }),
  },
  {
    id: "demo-fire",
    label: "demo: always fire",
    blurb: "high threshold — fires every poll",
    build: ({ agent, user }) => ({
      name: "demo: always fire",
      reasoning:
        "Demo rule. The watched wallet's balance is below an intentionally high threshold, so this should fire each poll. Confirm execute=true with high confidence — the goal is to demo on-chain reasoning + ER settlement.",
      watchAddress: agent,
      thresholdSol: "1000",
      actionTo: user,
      actionAmount: "0.001",
    }),
  },
  {
    id: "treasury-guard",
    label: "treasury guard",
    blurb: "agent runway monitor",
    build: ({ agent, user }) => ({
      name: "treasury guard",
      reasoning:
        "If the agent's own balance is genuinely depleting (not a momentary dip from tx fees), send a small alert transfer to the operator wallet. Confidence should drop if balance is only briefly low.",
      watchAddress: agent,
      thresholdSol: "0.2",
      actionTo: user,
      actionAmount: "0.001",
    }),
  },
];

export function RuleBuilder({ onCreated }: { onCreated: (r: Rule) => void }) {
  const { publicKey } = useWallet();
  const [name, setName] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [watchAddress, setWatchAddress] = useState("");
  const [thresholdSol, setThresholdSol] = useState("0.5");
  const [actionTo, setActionTo] = useState("");
  const [actionAmount, setActionAmount] = useState("0.01");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agentWallet, setAgentWallet] = useState<string | null>(null);
  const [activeTpl, setActiveTpl] = useState<string | null>(null);

  useEffect(() => {
    getStatus()
      .then((s) => setAgentWallet(s.agentWallet))
      .catch(() => {});
  }, []);

  function applyTemplate(t: Template) {
    if (!publicKey || !agentWallet) return;
    const v = t.build({
      agent: agentWallet,
      user: publicKey.toBase58(),
    });
    setName(v.name);
    setReasoning(v.reasoning);
    setWatchAddress(v.watchAddress);
    setThresholdSol(v.thresholdSol);
    setActionTo(v.actionTo);
    setActionAmount(v.actionAmount);
    setErrors({});
    setActiveTpl(t.id);
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "name required";
    if (!reasoning.trim()) e.reasoning = "reasoning prompt required";
    if (reasoning.trim().length < 10)
      e.reasoning = "prompt too short — give the LLM real context";
    if (!watchAddress.trim()) e.watchAddress = "watch address required";
    else if (!isValidPubkey(watchAddress.trim()))
      e.watchAddress = "not a valid Solana pubkey";
    if (!actionTo.trim()) e.actionTo = "send-to required";
    else if (!isValidPubkey(actionTo.trim()))
      e.actionTo = "not a valid Solana pubkey";
    const th = Number(thresholdSol);
    if (!Number.isFinite(th) || th <= 0) e.thresholdSol = "must be > 0";
    const am = Number(actionAmount);
    if (!Number.isFinite(am) || am <= 0) e.actionAmount = "must be > 0";
    if (!publicKey) e.wallet = "connect wallet first";
    return e;
  }

  async function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const rule: Rule = {
        id: crypto.randomUUID(),
        ownerWallet: publicKey!.toBase58(),
        agentNft: null,
        name: name.trim(),
        trigger: {
          type: "balance",
          params: {
            address: watchAddress.trim(),
            lamportsBelow: Math.floor(Number(thresholdSol) * 1_000_000_000),
          },
        },
        reasoningPrompt: reasoning.trim(),
        action: {
          type: "transfer",
          params: { to: actionTo.trim(), amountSol: Number(actionAmount) },
        },
        privacy: "public",
        enabled: true,
        createdAt: Date.now(),
      };
      const created = await createRule(rule);
      onCreated(created);
      setName("");
      setReasoning("");
      setWatchAddress("");
      setActionTo("");
      setErrors({});
      setActiveTpl(null);
    } finally {
      setSubmitting(false);
    }
  }

  const templatesReady = Boolean(publicKey && agentWallet);

  return (
    <div className="space-y-5">
      {/* Template chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/50">
            quick start
          </span>
          {!templatesReady && (
            <span className="font-mono text-[9px] text-ice/30">
              {publicKey ? "loading agent…" : "connect wallet for templates"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TEMPLATES.map((t) => {
            const active = activeTpl === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={!templatesReady}
                onClick={() => applyTemplate(t)}
                className={`group relative text-left rounded-xl border p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? "border-sky/50 bg-sky/10"
                    : "border-line bg-bg/40 hover:border-edge hover:bg-panel/60"
                }`}
              >
                {active && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-sky shadow-[0_0_8px_rgba(73,136,196,0.8)]" />
                )}
                <div
                  className={`font-mono text-xs font-semibold mb-1 ${
                    active ? "text-sky" : "text-ice/90"
                  }`}
                >
                  {t.label}
                </div>
                <div className="font-mono text-[10px] text-ice/40 leading-snug">
                  {t.blurb}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-edge to-transparent" />

      <Field label="name" htmlFor="rule-name" error={errors.name}>
        <input
          id="rule-name"
          autoComplete="off"
          className={`input-field ${errors.name ? "error" : ""}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setActiveTpl(null);
          }}
          placeholder="auto top-up"
        />
      </Field>

      <Field
        label="reasoning prompt"
        htmlFor="rule-reasoning"
        error={errors.reasoning}
      >
        <textarea
          id="rule-reasoning"
          className={`input-field h-24 resize-none ${
            errors.reasoning ? "error" : ""
          }`}
          value={reasoning}
          onChange={(e) => {
            setReasoning(e.target.value);
            setActiveTpl(null);
          }}
          placeholder="If wallet balance is genuinely low (not just a temp dip), top up with 0.01 SOL"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="watch address"
          htmlFor="rule-watch"
          error={errors.watchAddress}
        >
          <input
            id="rule-watch"
            autoComplete="off"
            spellCheck={false}
            className={`input-field ${errors.watchAddress ? "error" : ""}`}
            value={watchAddress}
            onChange={(e) => {
              setWatchAddress(e.target.value);
              setActiveTpl(null);
            }}
            placeholder="pubkey"
          />
        </Field>
        <Field
          label="threshold (SOL)"
          htmlFor="rule-threshold"
          error={errors.thresholdSol}
        >
          <input
            id="rule-threshold"
            inputMode="decimal"
            className={`input-field ${errors.thresholdSol ? "error" : ""}`}
            value={thresholdSol}
            onChange={(e) => {
              setThresholdSol(e.target.value);
              setActiveTpl(null);
            }}
          />
        </Field>
        <Field label="send to" htmlFor="rule-sendto" error={errors.actionTo}>
          <input
            id="rule-sendto"
            autoComplete="off"
            spellCheck={false}
            className={`input-field ${errors.actionTo ? "error" : ""}`}
            value={actionTo}
            onChange={(e) => {
              setActionTo(e.target.value);
              setActiveTpl(null);
            }}
            placeholder="pubkey"
          />
        </Field>
        <Field
          label="amount (SOL)"
          htmlFor="rule-amount"
          error={errors.actionAmount}
        >
          <input
            id="rule-amount"
            inputMode="decimal"
            className={`input-field ${errors.actionAmount ? "error" : ""}`}
            value={actionAmount}
            onChange={(e) => {
              setActionAmount(e.target.value);
              setActiveTpl(null);
            }}
          />
        </Field>
      </div>

      {errors.wallet && (
        <div className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {errors.wallet}
        </div>
      )}

      <button
        disabled={submitting}
        onClick={submit}
        className="btn-primary w-full font-mono font-semibold text-sm py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "deploying…" : "deploy rule →"}
      </button>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ice/50 mb-1.5"
      >
        {label}
      </label>
      {children}
      {error && (
        <div className="font-mono text-[10px] text-red-400 mt-1.5">{error}</div>
      )}
    </div>
  );
}
