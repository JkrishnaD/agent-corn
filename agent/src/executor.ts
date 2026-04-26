// Action executor.
//
// Two execution paths:
//   - "base" actions (transfer, swap) → raw web3.js + Jupiter HTTP. No SDK bloat.
//   - "er" actions (delegate, custom program invoke) → routed via MagicBlock Ephemeral
//     Rollups for sub-50ms settle, with optional commit back to base layer.

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import type { Rule, AgentEvent } from "@agent-corn/shared";
import { loadAgentKeypair, getConnection } from "./wallet.js";
import {
  buildConnections,
  ensureDelegated,
  executeOnEphemeralRollup,
} from "./magicblock.js";

// Parse PDA seeds from rule params. Accepts array of base64 strings or hex strings.
function parseSeeds(raw: unknown): Uint8Array[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((s) => {
    if (typeof s !== "string") throw new Error("seed must be string");
    if (s.startsWith("0x"))
      return new Uint8Array(Buffer.from(s.slice(2), "hex"));
    if (/^[A-Za-z0-9+/=]+$/.test(s))
      return new Uint8Array(Buffer.from(s, "base64"));
    return new Uint8Array(Buffer.from(s, "utf8"));
  });
}

// base layer: SOL transfer
async function transferSol(
  toBase58: string,
  amountSol: number
): Promise<string> {
  const conn = getConnection();
  const payer = loadAgentKeypair();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: new PublicKey(toBase58),
      lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
    })
  );
  return sendAndConfirmTransaction(conn, tx, [payer]);
}

// base layer: Jupiter swap
// Direct Jupiter v6 HTTP API. No SDK.
async function jupiterSwap(opts: {
  inputMint: string;
  outputMint: string;
  amount: number; // base units (lamports for SOL, atomic for SPL)
  slippageBps?: number;
}): Promise<string> {
  const conn = getConnection();
  const payer = loadAgentKeypair();
  const slippageBps = opts.slippageBps ?? 100;

  const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${opts.inputMint}&outputMint=${opts.outputMint}&amount=${opts.amount}&slippageBps=${slippageBps}`;
  const quote = await (await fetch(quoteUrl)).json();
  if (!quote || quote.error)
    throw new Error(`jupiter quote failed: ${JSON.stringify(quote)}`);

  const swapResp = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: payer.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  });
  const { swapTransaction } = await swapResp.json();
  if (!swapTransaction) throw new Error("jupiter swap returned no transaction");

  const tx = VersionedTransaction.deserialize(
    Buffer.from(swapTransaction, "base64")
  );
  tx.sign([payer]);
  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

// dispatcher
export async function executeAction(rule: Rule): Promise<Partial<AgentEvent>> {
  const a = rule.action;

  try {
    switch (a.type) {
      case "transfer": {
        const sig = await transferSol(
          a.params.to as string,
          a.params.amountSol as number
        );
        return {
          type: "action_settled",
          txSignature: sig,
          payload: { kind: "transfer", route: "base" },
        };
      }

      case "swap": {
        const sig = await jupiterSwap({
          inputMint: a.params.inputMint as string,
          outputMint: a.params.outputMint as string,
          amount: a.params.amount as number,
          slippageBps: a.params.slippageBps as number | undefined,
        });
        return {
          type: "action_settled",
          txSignature: sig,
          payload: { kind: "swap", route: "base" },
        };
      }

      case "delegate": {
        // Pure delegation — no action, no commit. Used to prep an account
        // for later ER invocations.
        const router = buildConnections();
        const payer = loadAgentKeypair();
        const pda = new PublicKey(a.params.pda as string);
        const ownerProgram = new PublicKey(a.params.ownerProgram as string);
        const seeds = parseSeeds(a.params.seeds);
        const commitFrequencyMs = a.params.commitFrequencyMs as
          | number
          | undefined;

        const result = await ensureDelegated({
          router,
          payer,
          pda,
          ownerProgram,
          delegate: { commitFrequencyMs, seeds },
        });

        return {
          type: "action_settled",
          txSignature: result.delegateSig,
          payload: {
            kind: "delegate",
            route: "magicblock",
            alreadyDelegated: result.alreadyDelegated,
            statusCheckMs: result.statusCheckMs,
            delegateMs: result.delegateMs,
          },
        };
      }

      case "custom": {
        // ER-aware program invoke. action.params:
        //   pda, ownerProgram, ixDataBase64, accounts[], seeds?, commitFrequencyMs?
        const router = buildConnections();
        const payer = loadAgentKeypair();
        const pda = new PublicKey(a.params.pda as string);
        const ownerProgram = new PublicKey(a.params.ownerProgram as string);
        const ixData = Buffer.from(a.params.ixDataBase64 as string, "base64");
        const accountMetas =
          (a.params.accounts as
            | Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>
            | undefined) ?? [];
        const seeds = parseSeeds(a.params.seeds);
        const commitFrequencyMs = a.params.commitFrequencyMs as
          | number
          | undefined;

        const actionIx = new TransactionInstruction({
          programId: ownerProgram,
          keys: accountMetas.map((m) => ({
            pubkey: new PublicKey(m.pubkey),
            isSigner: m.isSigner,
            isWritable: m.isWritable,
          })),
          data: ixData,
        });

        const result = await executeOnEphemeralRollup({
          router,
          payer,
          pda,
          ownerProgram,
          actionIx,
          delegate: { commitFrequencyMs, seeds },
          fetchCommitmentSig: a.params.fetchCommitmentSig !== false,
        });

        return {
          type: "action_settled",
          txSignature: result.erSig,
          payload: {
            kind: "er_invoke",
            route: "magicblock",
            durationMs: result.durationMs,
            delegateSig: result.delegateSig,
            commitmentSig: result.commitmentSig,
            alreadyDelegated: result.alreadyDelegated,
            phaseTimings: result.phaseTimings,
          },
        };
      }

      default:
        return {
          type: "error",
          payload: { msg: `Unsupported action: ${a.type}` },
        };
    }
  } catch (e) {
    return { type: "error", payload: { msg: String(e) } };
  }
}
