import Image from "next/image";
import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-bg overflow-x-hidden text-ice/90">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-line backdrop-blur-2xl bg-bg/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="relative w-7 h-7 rounded-lg bg-brand-fade flex items-center justify-center text-bg font-bold text-sm shadow-[0_0_18px_rgba(73,136,196,0.5)]">
              ▲
            </span>
            <span className="font-mono font-semibold text-sm tracking-tight text-ice">
              agent<span className="text-sky">cron</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="#how">how</NavLink>
            <NavLink href="#use">use cases</NavLink>
            <NavLink href="#stack">stack</NavLink>
            <NavLink href="https://github.com/JkrishnaD/agent-corn" external>
              github
            </NavLink>
          </div>
          <Link
            href="/dashboard"
            className="btn-primary inline-flex items-center gap-2 font-mono font-semibold text-xs px-4 py-2 rounded-lg"
          >
            launch app
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>

      <section className="relative px-6 pt-24 pb-40 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-halftone opacity-50 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[900px] h-[900px] rounded-full glow-orb pointer-events-none"
        />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-edge bg-panel/60 backdrop-blur-md mb-8 animate-fade-up">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ice/60">
              powered by
            </span>
            <Image
              src="/magic.png"
              alt="MagicBlock"
              width={80}
              height={20}
              className="h-4 w-auto opacity-90"
            />
          </div>

          <h1 className="font-display text-[clamp(56px,9vw,128px)] leading-[0.95] tracking-[-0.02em] mb-8 animate-fade-up [animation-delay:120ms]">
            <span className="block text-ice-gradient">The first</span>
            <span className="block">
              <em className="font-display italic text-brand-gradient">
                agentic cron
              </em>
            </span>
            <span className="block text-ice-gradient">on Solana.</span>
          </h1>

          <p className="font-sans text-base md:text-lg text-ice/55 leading-relaxed max-w-xl mx-auto mb-10 animate-fade-up [animation-delay:240ms]">
            Write rules in plain English. An LLM decides when to fire. Actions
            settle in under 50ms on MagicBlock — without leaking strategy to the
            mempool.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-20 animate-fade-up [animation-delay:360ms]">
            <Link
              href="/dashboard"
              className="btn-primary inline-flex items-center gap-2 font-mono font-semibold text-sm px-7 py-3.5 rounded-full"
            >
              launch dashboard
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#how"
              className="btn-ghost inline-flex items-center gap-2 font-mono text-sm px-7 py-3.5 rounded-full"
            >
              how it works
            </a>
          </div>

          {/* Hero stats card */}
          <div className="relative ">
            <div className="gradient-border rounded-2xl bg-panel/60 backdrop-blur-xl">
              <div className="grid grid-cols-3 divide-x divide-line">
                <HeroStat n="<50ms" l="exec latency" />
                <HeroStat n="100%" l="onchain audit" highlight />
                <HeroStat n="0" l="custom contracts" />
              </div>
            </div>
          </div>

          {/* Backed by row */}
          <div className="mt-16 flex flex-col items-center gap-4 animate-fade-up [animation-delay:600ms]">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ice/30">
              powered by
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 opacity-60">
              {["MagicBlock", "Helius", "Anthropic", "Metaplex", "Solana"].map(
                (n) => (
                  <span
                    key={n}
                    className="font-mono text-sm text-ice/60 tracking-tight"
                  >
                    {n}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* THREAT MODEL */}
      <section className="relative px-6 py-28">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            n="01"
            kicker="threat model"
            title={
              <>
                Rigid cron leaks strategy.
                <br />
                <em className="font-display italic text-brand-gradient">
                  Reasoning fixes that.
                </em>
              </>
            }
          />
          <div className="grid md:grid-cols-2 gap-4 mt-12">
            <Card variant="problem">
              <CardKicker tone="bad">the problem</CardKicker>
              <h3 className="font-display text-3xl text-ice mb-6 leading-tight">
                Hard rules fire on noise. Get rekt.
              </h3>
              <ul className="space-y-3">
                {[
                  "Clockwork was deprecated",
                  "Hard rules fire on temporary 1-sec dips",
                  "Strategy exposed to MEV in the mempool",
                  "No reasoning layer, no context awareness",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 font-sans text-sm text-ice/55 leading-relaxed"
                  >
                    <span className="text-red-400/80 shrink-0 mt-1">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="fix">
              <CardKicker tone="good">the fix</CardKicker>
              <h3 className="font-display text-3xl text-ice mb-6 leading-tight">
                A private reasoning layer between trigger and action.
              </h3>
              <ul className="space-y-3">
                {[
                  "Write rules in plain English",
                  "LLM evaluates fuzzy conditions in context",
                  "Private txns, fully MEV-resistant",
                  "Settles on MagicBlock ER in <50ms",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 font-sans text-sm text-ice/70 leading-relaxed"
                  >
                    <span className="text-sky shrink-0 mt-1">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <Divider />

      {/* HOW IT WORKS */}
      <section id="how" className="relative px-6 py-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-halftone opacity-30 [mask-image:linear-gradient(180deg,transparent,black_30%,black_70%,transparent)]"
        />
        <div className="relative max-w-6xl mx-auto">
          <SectionHeader
            n="02"
            kicker="execution flow"
            title={
              <>
                Rule → LLM → chain.
                <br />
                <span className="text-ice/40">No ambiguity. No leaks.</span>
              </>
            }
          />

          <div className="grid md:grid-cols-2 gap-4 mt-12">
            {[
              {
                n: "01",
                t: "define a rule",
                d: "Watch an address. Write a plain-English reasoning prompt. Set the action — transfer, swap, or invoke any ER-aware program.",
                badge: "natural language",
              },
              {
                n: "02",
                t: "agent monitors chain",
                d: "Polls Solana RPC every few seconds. When a trigger condition matches, a candidate event is queued for evaluation.",
                badge: "real-time polling",
              },
              {
                n: "03",
                t: "LLM reasons privately",
                d: "Claude evaluates your prompt against live onchain context. Returns shouldExecute, confidence, and a one-line rationale.",
                badge: "claude · anthropic",
              },
              {
                n: "04",
                t: "execute on magicblock ER",
                d: "Account state delegates to the Ephemeral Rollup. Action settles in <50ms then commits to base layer with full audit trail.",
                badge: "<50ms settlement",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="group relative gradient-border rounded-2xl bg-panel/40 backdrop-blur-sm p-7 transition-all hover:bg-panel/60 hover:-translate-y-0.5"
              >
                <div className="flex items-baseline justify-between mb-5">
                  <span className="font-display text-5xl text-brand-gradient leading-none">
                    {step.n}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-sky bg-sky/10 border border-sky/20 px-2.5 py-1 rounded-full">
                    {step.badge}
                  </span>
                </div>
                <h3 className="font-sans text-lg font-semibold text-ice mb-2">
                  {step.t}
                </h3>
                <p className="font-sans text-sm text-ice/55 leading-relaxed">
                  {step.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* USE CASES */}
      <section id="use" className="relative px-6 py-28">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            n="03"
            kicker="use cases"
            title={
              <>
                What devs are{" "}
                <em className="font-display italic text-brand-gradient">
                  shipping
                </em>
                .
              </>
            }
            sub="real strategies. private execution."
          />

          <div className="grid md:grid-cols-3 gap-4 mt-12">
            {[
              {
                n: "ops auto-funder",
                p: "If validator wallet is genuinely low (not a temp dip), top up from treasury.",
                tag: "treasury",
              },
              {
                n: "adaptive trader",
                p: "If SOL dipped sharply but momentum is still down, hold. If recovering, buy.",
                tag: "trading",
              },
              {
                n: "agent-to-agent pay",
                p: "Pay specialist agents privately when they complete tasks. Settled on ER.",
                tag: "a2a",
              },
            ].map((uc) => (
              <div
                key={uc.n}
                className="group relative rounded-2xl bg-panel/40 border border-line p-7 transition-all hover:border-edge hover:bg-panel/60 overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between gap-2 mb-5">
                  <span className="font-mono text-sm font-semibold text-ice">
                    {uc.n}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ice/40 border border-line px-2 py-0.5 rounded-full">
                    {uc.tag}
                  </span>
                </div>
                <p className="font-display italic text-xl text-ice/75 leading-snug">
                  &ldquo;{uc.p}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* STACK */}
      <section id="stack" className="relative px-6 py-28">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            n="04"
            kicker="stack"
            title={
              <>
                Zero custom contracts.
                <br />
                <em className="font-display italic text-brand-gradient">
                  Best-in-class primitives.
                </em>
              </>
            }
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
            {[
              { t: "MagicBlock", s: "ephemeral rollups" },
              { t: "Helius", s: "rpc + das api" },
              { t: "Metaplex Core", s: "agent identity nft" },
              { t: "Anthropic Claude", s: "reasoning brain" },
              { t: "Solana", s: "settlement layer" },
              { t: "Wallet Standard", s: "user auth" },
              { t: "Jupiter", s: "swap routing" },
              { t: "Next.js 15", s: "dashboard" },
            ].map((pill) => (
              <div
                key={pill.t}
                className="group rounded-xl bg-panel/40 border border-line px-5 py-4 transition-all hover:bg-raised/30 hover:border-edge"
              >
                <div className="font-sans text-sm font-semibold text-ice group-hover:text-sky transition-colors mb-1">
                  {pill.t}
                </div>
                <div className="font-mono text-[10px] text-ice/40 tracking-wider">
                  {pill.s}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* CTA */}
      <section className="relative px-6 py-36 text-center overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] glow-orb opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-halftone opacity-30 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent_70%)]"
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-ice/40 mb-6">
            // ready to deploy
          </div>
          <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-[0.95] tracking-[-0.02em] mb-6">
            <span className="text-ice-gradient">Ship rules,</span>
            <br />
            <em className="font-display italic text-brand-gradient">
              not cron jobs.
            </em>
          </h2>
          <p className="font-sans text-base text-ice/55 leading-relaxed mb-10 max-w-md mx-auto">
            Connect your wallet. Write a sentence. Watch your agent reason and
            act — privately.
          </p>
          <Link
            href="/dashboard"
            className="btn-primary inline-flex items-center gap-3 font-mono font-semibold text-sm px-9 py-4 rounded-full"
          >
            launch app
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-8 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-brand-fade flex items-center justify-center text-bg font-bold text-xs">
              ▲
            </span>
            <span className="text-ice/40 text-xs font-mono">
              agentcron · {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/JkrishnaD/agent-corn"
              target="_blank"
              rel="noreferrer"
              className="text-ice/40 hover:text-ice text-xs font-mono transition-colors"
            >
              github
            </a>
            <a
              href="https://x.com/jkdotsol"
              target="_blank"
              rel="noreferrer"
              className="text-ice/40 hover:text-ice text-xs font-mono transition-colors"
            >
              x
            </a>
            <Link
              href="/dashboard"
              className="text-ice/40 hover:text-ice text-xs font-mono transition-colors"
            >
              app
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function NavLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="text-ice/50 hover:text-ice text-xs font-mono px-3 py-2 transition-colors"
    >
      {children}
    </a>
  );
}

function SectionHeader({
  n,
  kicker,
  title,
  sub,
}: {
  n: string;
  kicker: string;
  title: React.ReactNode;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="font-mono text-xs text-sky">{n}</span>
        <span className="w-8 h-px bg-edge" />
        <span className="font-mono text-[10px] text-ice/40 tracking-[0.25em] uppercase">
          {kicker}
        </span>
      </div>
      <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.02] tracking-[-0.02em] text-ice">
        {title}
      </h2>
      {sub && (
        <p className="font-mono text-xs text-ice/40 mt-3 tracking-wider">
          {sub}
        </p>
      )}
    </div>
  );
}

function Card({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "problem" | "fix";
}) {
  return (
    <div
      className={`relative rounded-2xl p-10 overflow-hidden ${
        variant === "fix"
          ? "gradient-border bg-panel/60 backdrop-blur-sm"
          : "border border-line bg-panel/30"
      }`}
    >
      {variant === "fix" && (
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-20 w-72 h-72 glow-orb opacity-50"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function CardKicker({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "bad";
}) {
  return (
    <span
      className={`inline-block font-mono text-[10px] tracking-[0.25em] uppercase mb-5 ${
        tone === "good" ? "text-sky" : "text-red-400/80"
      }`}
    >
      {children}
    </span>
  );
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      className="h-px bg-gradient-to-r from-transparent via-edge to-transparent"
    />
  );
}

function HeroStat({
  n,
  l,
  highlight,
}: {
  n: string;
  l: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-6 py-7">
      <div
        className={`font-display text-4xl leading-none mb-1 ${
          highlight ? "text-brand-gradient" : "text-ice"
        }`}
      >
        {n}
      </div>
      <div className="font-mono text-[10px] text-ice/40 uppercase tracking-[0.2em]">
        {l}
      </div>
    </div>
  );
}
