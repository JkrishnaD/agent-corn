# AgentCron

> The first **agentic cron** on Solana. Write rules in plain English. An LLM
> decides when to fire. Actions settle on **MagicBlock Ephemeral Rollups** in
> under 200ms — with on-chain proof of every reasoning step.

[![devnet](https://img.shields.io/badge/cluster-devnet-9945FF?logo=solana&logoColor=white)](https://solscan.io/?cluster=devnet)
[![program](https://img.shields.io/badge/program-CJ2uqxr4…tRFugC-4988C4)](https://solscan.io/account/CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC?cluster=devnet)
[![license](https://img.shields.io/badge/license-MIT-BDE8F5)](#license)

---

Solana cron jobs were rigid (Clockwork was deprecated) and leaked strategy to
the mempool. AgentCron adds a **private reasoning layer** between trigger and
action: the agent watches chain state, asks Claude whether the rule should
fire given live context, and records every decision on-chain via
MagicBlock Ephemeral Rollups.

You get:

- **Fuzzy rules** — "top up if balance is _genuinely_ low, not a temp dip"
- **Privacy** — reasoning text stays off-chain; only `sha256(reasoning)` lands on chain
- **Proof of reasoning** — every LLM decision is a counter increment + confidence + hash, settled to Solana base layer
- **Sub-200ms hot-path** — measured live (see [proof](#on-chain-proof))

---

## Lifecycle of a rule

1. **Create** → allocates an `AgentContext` PDA on base layer + delegates it to MagicBlock.
2. **Monitor** (every 5s) → polls watched address balance.
3. **Trigger** → calls Claude with the rule prompt + live context.
4. **Reason** → Claude returns `{ shouldExecute, reasoning, confidence }`.
5. **Record** → `record_decision(confidence, executed, sha256(reasoning))` routes to ER (sub-200ms).
6. **Act** (if `shouldExecute`) → transfer / Jupiter swap on base layer.
7. **Delete** → `commit_and_undelegate` settles ER state back to base layer.

---

## Quick start

### Prereqs

- Node.js 20+ and npm
- Rust toolchain + Anchor CLI 0.32.1 (only if you want to rebuild the program)
- Solana keypair with **at least 1 SOL on devnet** (faucet: <https://faucet.solana.com>)
- API keys: Anthropic ([console.anthropic.com](https://console.anthropic.com)) and Helius ([helius.dev](https://helius.dev))

### 1. Clone + install

```bash
git clone https://github.com/JkrishnaD/agent-corn.git
cd agent-corn
npm install
```

### 2. Configure env

```bash
cp .env.example .env
```

Fill in:

```env
SOLANA_NETWORK=devnet
HELIUS_API_KEY=
HELIUS_RPC_URL=
SOLANA_PRIVATE_KEY=...           # base58 of agent keypair, fund w/ >= 1 SOL

ANTHROPIC_API_KEY=

MAGICBLOCK_RPC_URL=https://devnet.magicblock.app
AGENT_CRON_PROGRAM_ID=CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC

NEXT_PUBLIC_AGENT_API_URL=http://localhost:4000
NEXT_PUBLIC_AGENT_WS_URL=ws://localhost:4000
```

### 3. Verify reachability

```bash
cd agent
npx tsx src/scripts/smoke-magicblock.ts   # SDK + RPC sanity
npx tsx src/scripts/smoke-program.ts      # full lifecycle: init → delegate → 3× ER tick → commit
```

If `smoke-program.ts` prints `done. all txs landed on devnet + MagicBlock ER.` you're good.

### 4. Run

```bash
# terminal 1
cd agent && npm run dev

# terminal 2
cd web && npm run dev
```

Open <http://localhost:3000/dashboard>, connect your wallet, and click a quick-start template to deploy a rule.

---

## On-chain proof

Captured live from `smoke-program.ts` against devnet:

```
program  : CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC
agent    : 379y3FmQPgLsYoo8FszHd6sDwkYpUiW9HoTC7dJ25vmH
rule_id  : 72bad645-83ff-4fc2-a3f2-32010ba30799
pda      : 7FFyFnyJk9dTygqjEWmGVcfMjtFU72ojZd4BhjbLyRc4
```

| Phase                     | Layer     | Latency                       |
| ------------------------- | --------- | ----------------------------- |
| `initialize` + `delegate` | base      | **3784ms** total              |
| `record_decision` #1      | ER        | **624ms** (cold)              |
| `record_decision` #2      | ER        | **161ms**                     |
| `record_decision` #3      | ER        | **166ms**                     |
| `commit_and_undelegate`   | ER → base | base-layer commitment proof ✓ |

---

## On-chain program

Deployed at [`CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC`](https://solscan.io/account/CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC?cluster=devnet) on devnet.

### `AgentContext` PDA

Seeds: `["agent", owner, rule_id]`

```rust
pub struct AgentContext {
    pub owner: Pubkey,
    pub rule_id: [u8; 16],
    pub prompt_hash: [u8; 32],      // sha256 of user's reasoning prompt
    pub executions: u64,
    pub fired: u64,
    pub last_confidence: u8,        // 0..=100
    pub last_executed: bool,
    pub last_decision_at: i64,
    pub last_reasoning_hash: [u8; 32],
    pub bump: u8,
}
```

### Instructions

| Instruction                                             | Layer | Purpose                                         |
| ------------------------------------------------------- | ----- | ----------------------------------------------- |
| `initialize(rule_id, prompt_hash)`                      | base  | allocate PDA, set owner                         |
| `delegate(rule_id)`                                     | base  | flip ownership to MB delegation program         |
| `record_decision(confidence, executed, reasoning_hash)` | ER    | sub-200ms tick; bumps counters, writes metadata |
| `commit`                                                | ER    | manual settle to base, keep delegation          |
| `commit_and_undelegate`                                 | ER    | final settle + return ownership                 |

### Why hashes only

Reasoning text stays off-chain. Only `sha256` lands on chain — strategy isn't broadcast so MEV bots can't read your rule, and anyone can re-hash the off-chain rationale to verify it matches what was recorded. The agent can't retroactively change what it "thought."

---

## License

MIT. Built for the MagicBlock + Solana hackathon.
