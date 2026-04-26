"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import type { Rule } from "@agent-corn/shared";
import { createRule } from "@/lib/api";

function isValidPubkey(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="name" htmlFor="rule-name" error={errors.name}>
        <input
          id="rule-name"
          autoComplete="off"
          className={`input-field ${errors.name ? "error" : ""}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          onChange={(e) => setReasoning(e.target.value)}
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
            onChange={(e) => setWatchAddress(e.target.value)}
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
            onChange={(e) => setThresholdSol(e.target.value)}
          />
        </Field>
        <Field
          label="send to"
          htmlFor="rule-sendto"
          error={errors.actionTo}
        >
          <input
            id="rule-sendto"
            autoComplete="off"
            spellCheck={false}
            className={`input-field ${errors.actionTo ? "error" : ""}`}
            value={actionTo}
            onChange={(e) => setActionTo(e.target.value)}
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
            onChange={(e) => setActionAmount(e.target.value)}
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
