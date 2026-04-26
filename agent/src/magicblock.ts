// MagicBlock Ephemeral Rollups integration.
//
// Flow (per MagicBlock docs):
//   1. delegate(account) on base layer  — flips PDA ownership to MB delegation
//      program. Idempotent: we check `getDelegationStatus` first.
//   2. invoke action on Magic Router  — router auto-routes based on writable
//      accounts (delegated → ER endpoint, else base layer).
//   3. retrieve commitment signature  — `GetCommitmentSignature` returns the
//      base-layer settle sig for any ER tx. Proof of settlement.
//
// We use the official `@magicblock-labs/ephemeral-rollups-sdk` for every
// primitive (instruction builders, PDA derivation, magic-router transport).
// No hardcoded program IDs, discriminators, or PDA seeds.

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createDelegateInstruction,
  getDelegationStatus,
  sendAndConfirmMagicTransaction,
  GetCommitmentSignature,
  DELEGATION_PROGRAM_ID,
  MAGIC_PROGRAM_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { config } from "./config.js";

export { DELEGATION_PROGRAM_ID, MAGIC_PROGRAM_ID };

export type ConnRouter = {
  base: Connection; // Solana base layer (devnet/mainnet via Helius)
  ephemeral: Connection; // MagicBlock router endpoint (auto base/ER routing)
};

export function buildConnections(): ConnRouter {
  return {
    base: new Connection(config.heliusRpcUrl, "confirmed"),
    ephemeral: new Connection(config.magicBlockRpcUrl, "confirmed"),
  };
}

export interface ErExecuteResult {
  delegateSig?: string;
  erSig: string;
  commitmentSig?: string; // base-layer settle sig fetched after ER tx
  alreadyDelegated: boolean;
  durationMs: number;
  phaseTimings: {
    statusCheckMs: number;
    delegateMs: number;
    executeMs: number;
    commitmentLookupMs: number;
  };
}

interface DelegateOpts {
  commitFrequencyMs?: number; // how often MB validator auto-commits (default 30s)
  seeds?: Uint8Array[]; // PDA seeds for the delegated account
  validator?: PublicKey; // pin a specific validator (default: closest)
}

// Idempotent delegate: no-op if account already delegated.
export async function ensureDelegated(opts: {
  router: ConnRouter;
  payer: Keypair;
  pda: PublicKey;
  ownerProgram: PublicKey;
  delegate?: DelegateOpts;
}): Promise<{
  delegateSig?: string;
  alreadyDelegated: boolean;
  statusCheckMs: number;
  delegateMs: number;
}> {
  const { router, payer, pda, ownerProgram } = opts;
  const tStatus = Date.now();
  // getDelegationStatus is a MagicBlock router-specific JSON-RPC method,
  // must be queried against the MB router endpoint (not the base RPC).
  const status = await getDelegationStatus(router.ephemeral, pda)
    .then((s) => s ?? { isDelegated: false })
    .catch(() => ({ isDelegated: false }));
  const statusCheckMs = Date.now() - tStatus;

  if (status.isDelegated) {
    return { alreadyDelegated: true, statusCheckMs, delegateMs: 0 };
  }

  const tDel = Date.now();
  const delegateIx = createDelegateInstruction(
    {
      payer: payer.publicKey,
      delegatedAccount: pda,
      ownerProgram,
    },
    {
      commit_frequency_ms: opts.delegate?.commitFrequencyMs ?? 30_000,
      seeds: opts.delegate?.seeds ? [opts.delegate.seeds] : [],
      validator: opts.delegate?.validator,
    }
  );

  const sig = await sendAndConfirmTransaction(
    router.base,
    new Transaction().add(delegateIx),
    [payer]
  );
  return {
    delegateSig: sig,
    alreadyDelegated: false,
    statusCheckMs,
    delegateMs: Date.now() - tDel,
  };
}

// Full flow: ensure-delegated → execute on Magic Router → fetch commit sig.
export async function executeOnEphemeralRollup(opts: {
  router: ConnRouter;
  payer: Keypair;
  pda: PublicKey;
  ownerProgram: PublicKey;
  actionIx: TransactionInstruction;
  delegate?: DelegateOpts;
  fetchCommitmentSig?: boolean; // default true
}): Promise<ErExecuteResult> {
  const { router, payer, pda, ownerProgram, actionIx } = opts;
  const tAll = Date.now();

  // Phase 1: ensure delegation
  const del = await ensureDelegated({
    router,
    payer,
    pda,
    ownerProgram,
    delegate: opts.delegate,
  });

  // Phase 2: execute on router (writable PDA is delegated → routed to ER)
  const tExec = Date.now();
  const erTx = new Transaction().add(actionIx);
  const erSig = await sendAndConfirmMagicTransaction(router.ephemeral, erTx, [
    payer,
  ]);
  const executeMs = Date.now() - tExec;

  // Phase 3: fetch base-layer commitment signature (proof of settlement)
  let commitmentSig: string | undefined;
  let commitmentLookupMs = 0;
  if (opts.fetchCommitmentSig !== false) {
    const tCommit = Date.now();
    commitmentSig = await GetCommitmentSignature(erSig, router.ephemeral).catch(
      () => undefined
    );
    commitmentLookupMs = Date.now() - tCommit;
  }

  return {
    delegateSig: del.delegateSig,
    erSig,
    commitmentSig,
    alreadyDelegated: del.alreadyDelegated,
    durationMs: Date.now() - tAll,
    phaseTimings: {
      statusCheckMs: del.statusCheckMs,
      delegateMs: del.delegateMs,
      executeMs,
      commitmentLookupMs,
    },
  };
}
