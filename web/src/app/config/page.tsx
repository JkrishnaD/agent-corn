"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStatus } from "@/lib/api";

const PROGRAM_ID = "CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC";
const REPO_URL = "https://github.com/JkrishnaD/agent-corn";

export default function ConfigPage() {
  const [agentWallet, setAgentWallet] = useState<string | null>(null);
  const [running, setRunning] = useState<boolean | null>(null);

  useEffect(() => {
    getStatus()
      .then((s) => {
        setAgentWallet(s.agentWallet);
        setRunning(s.running);
      })
      .catch(() => setRunning(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-ice/90 relative">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-halftone opacity-20 pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
      />

      <nav className="sticky top-0 z-50 border-b border-line backdrop-blur-2xl bg-bg/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
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
              config
            </span>
          </div>
          <Link
            href="/dashboard"
            className="btn-ghost inline-flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-full"
          >
            ← dashboard
          </Link>
        </div>
      </nav>

      <main className="relative max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-[10px] text-ice/40 tracking-[0.25em] uppercase">
              setup
            </span>
            <span className="w-8 h-px bg-edge" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.02em] mb-3">
            <span className="text-ice-gradient">Run your own </span>
            <em className="font-display italic text-brand-gradient">agent</em>
          </h1>
          <p className="font-sans text-sm text-ice/60 max-w-xl leading-relaxed">
            AgentCron is single-tenant by design. To use it for real, fork the
            repo, plug in your own keypair + Anthropic key, and run the agent
            locally. Your keys never leave your machine.
          </p>
        </div>

        {/* Live agent panel */}
        <Section
          n="01"
          title="this dashboard's agent"
          sub="signed transactions you see come from this wallet"
        >
          <div className="gradient-border rounded-2xl bg-panel/60 backdrop-blur-md p-6 space-y-4">
            <Row label="status">
              {running === null ? (
                <span className="font-mono text-xs text-ice/40">…</span>
              ) : running ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky shadow-[0_0_8px_rgba(73,136,196,0.9)]" />
                  <span className="font-mono text-xs text-sky">live</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="font-mono text-xs text-red-400">
                    unreachable
                  </span>
                </span>
              )}
            </Row>
            <Row label="agent wallet">
              {agentWallet ? (
                <CopyValue
                  value={agentWallet}
                  href={`https://solscan.io/account/${agentWallet}?cluster=devnet`}
                />
              ) : (
                <span className="font-mono text-xs text-ice/40">…</span>
              )}
            </Row>
            <Row label="program">
              <CopyValue
                value={PROGRAM_ID}
                href={`https://solscan.io/account/${PROGRAM_ID}?cluster=devnet`}
              />
            </Row>
            <Row label="cluster">
              <span className="font-mono text-xs text-ice/70">devnet</span>
            </Row>
          </div>
        </Section>

        {/* Self-host */}
        <Section
          n="02"
          title="run it yourself"
          sub="3 minutes from clone to live agent"
        >
          <div className="space-y-4">
            <Step
              n="1"
              title="clone the repo"
              code={`git clone ${REPO_URL}
cd agent-corn
npm install`}
            />

            <Step
              n="2"
              title="generate an agent keypair"
              body="Make a fresh keypair just for the agent. Don't reuse your main wallet."
              code={`solana-keygen new --outfile ~/.config/solana/agent-cron.json
solana-keygen pubkey ~/.config/solana/agent-cron.json
# copy that pubkey, fund it on devnet:
solana airdrop 2 <PUBKEY> --url devnet`}
            />

            <Step
              n="3"
              title="export the secret as base58"
              body="The agent reads SOLANA_PRIVATE_KEY as a base58 string."
              code={`# one-liner: read JSON array, encode bs58
node -e "const fs=require('fs');const bs58=require('bs58');console.log(bs58.default.encode(Buffer.from(JSON.parse(fs.readFileSync(process.env.HOME+'/.config/solana/agent-cron.json')))))"`}
            />

            <Step
              n="4"
              title="configure .env"
              body="Copy the template, fill in 3 keys."
              code={`cp .env.example .env`}
            >
              <EnvBlock />
            </Step>

            <Step
              n="5"
              title="verify reachability"
              body="The smoke scripts confirm RPC, MagicBlock router, and the program lifecycle work end-to-end."
              code={`cd agent
npx tsx src/scripts/smoke-magicblock.ts   # 11 checks
npx tsx src/scripts/smoke-program.ts      # init → delegate → 3 ER ticks → commit`}
            />

            <Step
              n="6"
              title="run the stack"
              code={`# terminal 1
cd agent && npm run dev

# terminal 2
cd web && npm run dev

# open http://localhost:3000/dashboard`}
            />
          </div>
        </Section>

        {/* Trust model */}
        <Section n="03" title="trust model" sub="who sees what">
          <div className="grid md:grid-cols-2 gap-4">
            <TrustCard tone="good" title="stays on your machine">
              <li>SOLANA_PRIVATE_KEY (agent keypair)</li>
              <li>ANTHROPIC_API_KEY</li>
              <li>HELIUS_API_KEY</li>
              <li>full LLM reasoning text + rule prompts</li>
            </TrustCard>
            <TrustCard tone="meta" title="on chain (public)">
              <li>AgentContext PDA per rule</li>
              <li>execution counter, fired count, last confidence</li>
              <li>
                <span className="text-sky">sha256</span> of prompt + each
                rationale
              </li>
              <li>tx signatures (transfer/swap)</li>
            </TrustCard>
          </div>
          <p className="font-mono text-[11px] text-ice/40 leading-relaxed mt-4">
            Reasoning text never lands on chain. Anyone can re-hash your stored
            rationale to verify it matches what was recorded — agent can't
            retro-edit decisions.
          </p>
        </Section>

        {/* Limits */}
        <Section
          n="04"
          title="known limits"
          sub="hackathon scope, not architecture"
        >
          <ul className="space-y-2">
            {[
              "Rules in memory only — agent restart loses rules. JSON-file persistence is trivial to add.",
              "Single-tenant: one agent keypair owns all PDAs. Multi-user needs keypair-per-rule auth.",
              "Monitor is RPC-poll (5s). Helius webhooks pluggable — interface is in monitor.ts.",
              "Only `transfer` action wired in dashboard. `swap` and `custom` work via direct POST /rules.",
            ].map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 font-sans text-sm text-ice/55 leading-relaxed"
              >
                <span className="text-ice/30 shrink-0 mt-1">—</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>

        {/* CTA */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-flex items-center gap-2 font-mono font-semibold text-sm px-6 py-3 rounded-full"
          >
            github
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost inline-flex items-center gap-2 font-mono text-sm px-6 py-3 rounded-full"
          >
            devnet faucet
            <span aria-hidden="true">↗</span>
          </a>
          <Link
            href="/dashboard"
            className="btn-ghost inline-flex items-center gap-2 font-mono text-sm px-6 py-3 rounded-full"
          >
            open dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  n,
  title,
  sub,
  children,
}: {
  n: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-xs text-sky">{n}</span>
        <span className="w-6 h-px bg-edge" />
        <span className="font-mono text-[10px] text-ice/40 tracking-[0.25em] uppercase">
          {title}
        </span>
      </div>
      {sub && (
        <p className="font-mono text-[11px] text-ice/40 mb-4 tracking-wider">
          {sub}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-line last:border-0">
      <span className="font-mono text-[10px] text-ice/40 uppercase tracking-[0.2em]">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function CopyValue({ value, href }: { value: string; href?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="font-mono text-xs text-ice/80 truncate">{value}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/40 hover:text-sky px-2 py-1 rounded border border-line hover:border-sky/40 transition-colors"
      >
        {copied ? "✓" : "copy"}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/40 hover:text-sky px-2 py-1 rounded border border-line hover:border-sky/40 transition-colors"
        >
          ↗
        </a>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  body,
  code,
  children,
}: {
  n: string;
  title: string;
  body?: string;
  code?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel/40 backdrop-blur-sm p-5">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-display text-2xl text-brand-gradient leading-none">
          {n}
        </span>
        <h3 className="font-sans text-base font-semibold text-ice">{title}</h3>
      </div>
      {body && (
        <p className="font-sans text-sm text-ice/55 leading-relaxed mb-3 ml-9">
          {body}
        </p>
      )}
      {code && <CodeBlock code={code} />}
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative ml-9 mt-2">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ice/40 hover:text-sky px-2 py-1 rounded border border-line hover:border-sky/40 bg-bg/80 backdrop-blur transition-colors"
      >
        {copied ? "copied" : "copy"}
      </button>
      <pre className="rounded-xl bg-bg/70 border border-line p-4 pr-20 overflow-x-auto font-mono text-[12px] leading-relaxed text-ice/85 whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function EnvBlock() {
  const env = `# Solana
SOLANA_NETWORK=devnet
HELIUS_API_KEY=<your helius key>
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=<your helius key>
SOLANA_PRIVATE_KEY=<base58 of your agent keypair from step 3>

# LLM
ANTHROPIC_API_KEY=sk-ant-...

# MagicBlock router (devnet, public — no key needed)
MAGICBLOCK_RPC_URL=https://devnet.magicblock.app

# Pre-deployed program (devnet)
AGENT_CRON_PROGRAM_ID=CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC

# Web
NEXT_PUBLIC_AGENT_API_URL=http://localhost:4000
NEXT_PUBLIC_AGENT_WS_URL=ws://localhost:4000`;
  return <CodeBlock code={env} />;
}

function TrustCard({
  tone,
  title,
  children,
}: {
  tone: "good" | "meta";
  title: string;
  children: React.ReactNode;
}) {
  const colors =
    tone === "good"
      ? {
          border: "border-sky/30",
          bg: "bg-sky/5",
          accent: "text-sky",
          dash: "text-sky",
        }
      : {
          border: "border-line",
          bg: "bg-panel/40",
          accent: "text-ice/70",
          dash: "text-ice/30",
        };
  return (
    <div
      className={`rounded-2xl border ${colors.border} ${colors.bg} backdrop-blur-sm p-5`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.25em] mb-4 ${colors.accent}`}
      >
        {title}
      </div>
      <ul className="space-y-2 font-sans text-sm text-ice/70 leading-relaxed">
        {Array.isArray(children) ? children : [children]}
      </ul>
    </div>
  );
}
