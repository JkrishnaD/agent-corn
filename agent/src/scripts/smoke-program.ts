// Full program lifecycle smoke test against real devnet + MagicBlock router.
//
// Runs:
//   1. initialize (base layer)  → creates AgentContext PDA
//   2. delegate (base layer)    → flips ownership to MB delegation program
//   3. record_decision (ER) × 3 → sub-50ms ticks
//   4. commit_and_undelegate    → settle + return ownership
//
// Each step prints sig + duration. Save these in README as proof for judges.
//
// Run: cd agent && npx tsx src/scripts/smoke-program.ts

import { randomUUID } from "node:crypto";
import {
  initializeAndDelegate,
  recordDecisionOnEr,
  commitAndUndelegate,
  deriveAgentContext,
  ruleIdBytes,
} from "../program.js";
import { loadAgentKeypair } from "../wallet.js";
import { config } from "../config.js";

async function main() {
  const ruleId = randomUUID();
  const payer = loadAgentKeypair();
  const [pda] = deriveAgentContext(payer.publicKey, ruleIdBytes(ruleId));

  console.log("agent_cron program lifecycle smoke");
  console.log("==================================");
  console.log(`program  : ${config.agentCronProgramId}`);
  console.log(`agent    : ${payer.publicKey.toBase58()}`);
  console.log(`rule_id  : ${ruleId}`);
  console.log(`pda      : ${pda.toBase58()}`);
  console.log();

  console.log("→ initialize + delegate");
  const init = await initializeAndDelegate({
    ruleId,
    reasoningPrompt:
      "If the wallet balance is genuinely low (not a temp dip), top up with 0.01 SOL",
  });
  console.log(`  init     ${init.initSig}`);
  console.log(`  delegate ${init.delegateSig}`);
  console.log(`  duration ${init.durationMs}ms`);
  console.log();

  for (let i = 1; i <= 3; i++) {
    console.log(`→ record_decision #${i}`);
    const r = await recordDecisionOnEr({
      ruleId,
      confidence: 0.5 + i * 0.15,
      executed: i % 2 === 0,
      reasoningText: `tick ${i}: balance check passed at ${new Date().toISOString()}`,
    });
    console.log(`  er       ${r.erSig}`);
    console.log(`  commit   ${r.commitmentSig ?? "(pending)"}`);
    console.log(`  duration ${r.durationMs}ms`);
    console.log();
  }

  console.log("→ commit_and_undelegate");
  const fin = await commitAndUndelegate({ ruleId });
  console.log(`  sig      ${fin.sig}`);
  console.log(`  commit   ${fin.commitmentSig ?? "(pending)"}`);
  console.log();

  console.log("done. all txs landed on devnet + MagicBlock ER.");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
