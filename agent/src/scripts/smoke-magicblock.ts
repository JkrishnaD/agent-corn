// MagicBlock smoke test.
//
// Verifies in order:
//   1. env loaded, agent keypair valid, base RPC reachable, devnet SOL balance
//   2. MagicBlock router endpoint reachable (getVersion + getSlot)
//   3. SDK constants resolve (DELEGATION_PROGRAM_ID, MAGIC_PROGRAM_ID, MAGIC_CONTEXT_ID)
//   4. SDK helper `getClosestValidator` returns a validator pubkey
//   5. SDK helper `getDelegationStatus` returns a status for a known account
//   6. SDK builder `createDelegateInstruction` produces a valid IX (does NOT submit)
//
// Run:
//   pnpm --filter @agent-corn/agent tsx src/scripts/smoke-magicblock.ts
//   (or)  cd agent && npx tsx src/scripts/smoke-magicblock.ts

import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
  DELEGATION_PROGRAM_ID,
  MAGIC_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  createDelegateInstruction,
  getClosestValidator,
  getDelegationStatus,
} from "@magicblock-labs/ephemeral-rollups-sdk";

// Load .env from monorepo root
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const env = {
  heliusRpcUrl:
    process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com",
  magicBlockRpcUrl:
    process.env.MAGICBLOCK_RPC_URL ?? "https://devnet.magicblock.app",
  agentPrivateKey: process.env.SOLANA_PRIVATE_KEY ?? "",
};

function loadAgentKeypair(): Keypair {
  const raw = env.agentPrivateKey;
  if (!raw) throw new Error("SOLANA_PRIVATE_KEY not set in .env");
  if (raw.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }
  return Keypair.fromSecretKey(bs58.decode(raw));
}

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];
function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}  ${detail}`);
}

async function main() {
  console.log("MagicBlock smoke test\n=====================");
  console.log(`base RPC : ${env.heliusRpcUrl.replace(/api-key=[^&]+/, "api-key=***")}`);
  console.log(`MB router: ${env.magicBlockRpcUrl.replace(/(token|api-key)=[^&]+/, "$1=***")}\n`);

  // 1. agent keypair + base RPC + balance
  let payer;
  try {
    payer = loadAgentKeypair();
    record("agent keypair", true, payer.publicKey.toBase58());
  } catch (e) {
    record("agent keypair", false, String(e));
    return finish();
  }

  const base = new Connection(env.heliusRpcUrl, "confirmed");
  try {
    const v = await base.getVersion();
    record("base RPC reachable", true, `solana ${v["solana-core"]}`);
  } catch (e) {
    record("base RPC reachable", false, String(e));
  }

  try {
    const lamports = await base.getBalance(payer.publicKey);
    const sol = lamports / 1e9;
    record(
      "agent balance",
      sol > 0,
      `${sol.toFixed(4)} SOL${sol === 0 ? " — fund w/ devnet faucet" : ""}`
    );
  } catch (e) {
    record("agent balance", false, String(e));
  }

  // 2. MB router reachable
  const er = new Connection(env.magicBlockRpcUrl, "confirmed");
  try {
    const v = await er.getVersion();
    record("MB router getVersion", true, JSON.stringify(v));
  } catch (e) {
    record("MB router getVersion", false, String(e));
  }
  try {
    const slot = await er.getSlot();
    record("MB router getSlot", true, `slot=${slot}`);
  } catch (e) {
    record("MB router getSlot", false, String(e));
  }

  // 3. SDK constants
  record("DELEGATION_PROGRAM_ID", DELEGATION_PROGRAM_ID instanceof PublicKey, DELEGATION_PROGRAM_ID.toBase58());
  record("MAGIC_PROGRAM_ID", MAGIC_PROGRAM_ID instanceof PublicKey, MAGIC_PROGRAM_ID.toBase58());
  record("MAGIC_CONTEXT_ID", MAGIC_CONTEXT_ID instanceof PublicKey, MAGIC_CONTEXT_ID.toBase58());

  // 4. closest validator (uses MB router)
  try {
    const v = await getClosestValidator(er);
    record("getClosestValidator", true, v.toBase58());
  } catch (e) {
    record("getClosestValidator", false, truncate(String(e)));
  }

  // 5. delegation status — must query MB router (custom JSON-RPC method)
  try {
    const status = await getDelegationStatus(er, payer.publicKey);
    const isDel = status?.isDelegated ?? false;
    record(
      "getDelegationStatus(agent)",
      true,
      `isDelegated=${isDel} (expected false for system-owned wallet)`
    );
  } catch (e) {
    record("getDelegationStatus(agent)", false, truncate(String(e)));
  }

  // 6. instruction builder (offline, no submit)
  try {
    const fakePda = PublicKey.unique();
    const fakeProgram = PublicKey.unique();
    const ix = createDelegateInstruction(
      {
        payer: payer.publicKey,
        delegatedAccount: fakePda,
        ownerProgram: fakeProgram,
      },
      { commit_frequency_ms: 30_000, seeds: [] }
    );
    const tx = new Transaction().add(ix);
    const ok =
      ix.programId.equals(DELEGATION_PROGRAM_ID) &&
      tx.instructions.length === 1 &&
      ix.keys.length > 0;
    record(
      "createDelegateInstruction",
      ok,
      `programId=${ix.programId.toBase58().slice(0, 8)}… keys=${ix.keys.length} dataLen=${ix.data.length}`
    );
  } catch (e) {
    record("createDelegateInstruction", false, truncate(String(e)));
  }

  finish();
}

function truncate(s: string, n = 120): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function finish() {
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;
  console.log(`\n${passed}/${checks.length} passed${failed ? `, ${failed} FAILED` : ""}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
