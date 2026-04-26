// Anchor client for the on-chain `agent_cron` program.
//
// Lifecycle helpers, all called by the agent's keypair (the program's `owner`):
//   - initializeAndDelegate(rule)  — base layer, creates AgentContext PDA + delegates to MB
//   - recordDecision(rule, ...)    — Magic Router, runs on ER (sub-50ms)
//   - commitAndUndelegate(rule)    — Magic Router, settles + returns ownership
//
// We use the agent's keypair as the on-chain `owner`. The user's wallet is
// stored in Rule.ownerWallet for display only — auth lives at the API layer.
// Single-agent design; multi-agent would require keypair-per-rule.

import { createHash } from "node:crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { GetCommitmentSignature } from "@magicblock-labs/ephemeral-rollups-sdk";

// Magic Router blockhash via direct JSON-RPC. SDK's helper has a result-shape
// bug (reads `result.blockhash` but server returns `result.value.blockhash`),
// and `sendMagicTransaction` overwrites our blockhash with the broken helper.
// So we bypass the SDK transport entirely for ER sends.
async function getMagicBlockhash(
  endpoint: string,
  writableAccounts: string[]
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBlockhashForAccounts",
      params: [writableAccounts],
    }),
  });
  const j = (await r.json()) as {
    result?: {
      value?: { blockhash?: string; lastValidBlockHeight?: number };
      blockhash?: string;
      lastValidBlockHeight?: number;
    };
  };
  const bh = j.result?.value?.blockhash ?? j.result?.blockhash;
  const lvbh =
    j.result?.value?.lastValidBlockHeight ?? j.result?.lastValidBlockHeight ?? 0;
  if (!bh) throw new Error(`MB router returned no blockhash: ${JSON.stringify(j)}`);
  return { blockhash: bh, lastValidBlockHeight: lvbh };
}

async function sendMagicRaw(
  conn: Connection,
  tx: Transaction,
  payer: Keypair,
  writableAccounts: string[]
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await getMagicBlockhash(
    conn.rpcEndpoint,
    writableAccounts
  );
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  // Poll signature status against the ER endpoint.
  await pollSig(conn, sig, 12_000);
  return sig;
}

async function pollSig(conn: Connection, sig: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await conn.getSignatureStatus(sig);
    const v = s?.value;
    if (v && (v.confirmationStatus === "confirmed" || v.confirmationStatus === "finalized")) {
      if (v.err) throw new Error(`tx failed: ${JSON.stringify(v.err)}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`tx ${sig} not confirmed within ${timeoutMs}ms`);
}
import idl from "./idl/agent_cron.json" with { type: "json" };
import type { AgentCron } from "./idl/agent_cron.js";
import { config } from "./config.js";
import { loadAgentKeypair } from "./wallet.js";
import { buildConnections } from "./magicblock.js";

const AGENT_SEED = Buffer.from("agent");

let _program: Program<AgentCron> | null = null;
let _baseConn: Connection | null = null;
let _erConn: Connection | null = null;
let _payer: Keypair | null = null;

function getPayer(): Keypair {
  if (!_payer) _payer = loadAgentKeypair();
  return _payer;
}

function getProgram(): Program<AgentCron> {
  if (_program) return _program;
  const conns = buildConnections();
  _baseConn = conns.base;
  _erConn = conns.ephemeral;
  const wallet = new Wallet(getPayer());
  const provider = new AnchorProvider(_baseConn, wallet, {
    commitment: "confirmed",
  });
  _program = new Program<AgentCron>(idl as AgentCron, provider);
  return _program;
}

function getErConn(): Connection {
  if (!_erConn) buildConnections().ephemeral; // initialize
  if (!_erConn) _erConn = buildConnections().ephemeral;
  return _erConn;
}

// Convert a uuid string (with or without dashes) to a 16-byte array.
export function ruleIdBytes(ruleId: string): Buffer {
  const hex = ruleId.replace(/-/g, "");
  if (hex.length !== 32) {
    // Not a UUID — hash to 16 bytes deterministically.
    return createHash("sha256").update(ruleId).digest().subarray(0, 16);
  }
  return Buffer.from(hex, "hex");
}

export function sha256Bytes(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

export function deriveAgentContext(
  owner: PublicKey,
  ruleIdBuf: Buffer
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGENT_SEED, owner.toBuffer(), ruleIdBuf],
    new PublicKey(config.agentCronProgramId)
  );
}

export interface InitDelegateResult {
  pda: string;
  initSig: string;
  delegateSig: string;
  durationMs: number;
}

// Step 1 (rule create): allocate AgentContext PDA on base layer + delegate to MB.
// Idempotent: skips init if PDA already exists.
export async function initializeAndDelegate(opts: {
  ruleId: string;
  reasoningPrompt: string;
}): Promise<InitDelegateResult> {
  const program = getProgram();
  const payer = getPayer();
  const ruleIdBuf = ruleIdBytes(opts.ruleId);
  const promptHash = sha256Bytes(opts.reasoningPrompt);
  const [pda] = deriveAgentContext(payer.publicKey, ruleIdBuf);

  const t0 = Date.now();

  // Check if already initialized
  const existing = await _baseConn!.getAccountInfo(pda);
  let initSig: string;
  if (!existing) {
    initSig = await program.methods
      .initialize(Array.from(ruleIdBuf), Array.from(promptHash))
      .accountsStrict({
        agentContext: pda,
        owner: payer.publicKey,
        systemProgram: PublicKey.default,
      })
      .rpc();
  } else {
    initSig = "already-initialized";
  }

  // Delegate (idempotent — program-side will fail if already delegated;
  // we wrap in try/catch).
  let delegateSig: string;
  try {
    delegateSig = await program.methods
      .delegate(Array.from(ruleIdBuf))
      .accountsPartial({
        owner: payer.publicKey,
        agentContext: pda,
      })
      .rpc();
  } catch (e) {
    // Most likely "already delegated" — accept and move on.
    delegateSig = `skipped: ${truncate(String(e))}`;
  }

  return {
    pda: pda.toBase58(),
    initSig,
    delegateSig,
    durationMs: Date.now() - t0,
  };
}

export interface RecordDecisionResult {
  pda: string;
  erSig: string;
  commitmentSig?: string;
  durationMs: number;
}

// Step 2 (per LLM decision): record on ER. Sub-50ms because PDA is delegated.
export async function recordDecisionOnEr(opts: {
  ruleId: string;
  confidence: number; // 0..1
  executed: boolean;
  reasoningText: string;
}): Promise<RecordDecisionResult> {
  const program = getProgram();
  const payer = getPayer();
  const er = getErConn();
  const ruleIdBuf = ruleIdBytes(opts.ruleId);
  const reasoningHash = sha256Bytes(opts.reasoningText);
  const [pda] = deriveAgentContext(payer.publicKey, ruleIdBuf);
  const confidenceU8 = Math.max(0, Math.min(100, Math.round(opts.confidence * 100)));

  const ix = await program.methods
    .recordDecision(confidenceU8, opts.executed, Array.from(reasoningHash))
    .accountsStrict({
      agentContext: pda,
      owner: payer.publicKey,
    })
    .instruction();

  const t0 = Date.now();
  const tx = new Transaction().add(ix);
  const erSig = await sendMagicRaw(er, tx, payer, [
    payer.publicKey.toBase58(),
    pda.toBase58(),
  ]);
  const durationMs = Date.now() - t0;

  // Fetch base-layer settle sig (proof of commitment).
  const commitmentSig = await GetCommitmentSignature(erSig, er).catch(
    () => undefined
  );

  return { pda: pda.toBase58(), erSig, commitmentSig, durationMs };
}

export interface CommitUndelegateResult {
  pda: string;
  sig: string;
  commitmentSig?: string;
}

// Step 3 (rule delete or pause): final settle + return ownership to program.
export async function commitAndUndelegate(opts: {
  ruleId: string;
}): Promise<CommitUndelegateResult> {
  const program = getProgram();
  const payer = getPayer();
  const er = getErConn();
  const ruleIdBuf = ruleIdBytes(opts.ruleId);
  const [pda] = deriveAgentContext(payer.publicKey, ruleIdBuf);

  const ix = await program.methods
    .commitAndUndelegate()
    .accountsPartial({
      owner: payer.publicKey,
      agentContext: pda,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  const sig = await sendMagicRaw(er, tx, payer, [
    payer.publicKey.toBase58(),
    pda.toBase58(),
  ]);
  const commitmentSig = await GetCommitmentSignature(sig, er).catch(
    () => undefined
  );
  return { pda: pda.toBase58(), sig, commitmentSig };
}

function truncate(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

