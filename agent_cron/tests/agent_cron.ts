import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as crypto from "crypto";
import { assert } from "chai";
import { AgentCron } from "../target/types/agent_cron";

const AGENT_SEED = Buffer.from("agent");

/** Generate a random 16-byte rule ID (UUID-like). */
function randomRuleId(): Uint8Array {
  return crypto.randomBytes(16);
}

/** Generate a random 32-byte SHA-256-like hash. */
function randomHash(): Uint8Array {
  return crypto.randomBytes(32);
}

/** Derive the AgentContext PDA deterministically. */
function findAgentContextPDA(
  owner: PublicKey,
  ruleId: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGENT_SEED, owner.toBuffer(), Buffer.from(ruleId)],
    programId
  );
}

/**
 * Fund a secondary keypair by transferring SOL from the provider wallet.
 * No faucet/airdrop needed — works reliably on devnet with your own balance.
 */
async function fundFromWallet(
  provider: anchor.AnchorProvider,
  destination: PublicKey,
  lamports = 0.01 * anchor.web3.LAMPORTS_PER_SOL
): Promise<void> {
  const tx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: destination,
      lamports,
    })
  );
  await provider.sendAndConfirm(tx);
}

describe("agent_cron", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.agentCron as Program<AgentCron>;
  const connection = provider.connection;

  describe("initialize", () => {
    it("creates AgentContext PDA with correct zero-value initial state", async () => {
      const ruleId = randomRuleId();
      const promptHash = randomHash();
      const owner = provider.wallet.publicKey;
      const [pda] = findAgentContextPDA(owner, ruleId, program.programId);

      await program.methods
        .initialize(Array.from(ruleId), Array.from(promptHash))
        .accounts({
          agentContext: pda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);

      assert.ok(acc.owner.equals(owner), "owner should match signer");
      assert.deepEqual(
        Array.from(acc.ruleId),
        Array.from(ruleId),
        "rule_id mismatch"
      );
      assert.deepEqual(
        Array.from(acc.promptHash),
        Array.from(promptHash),
        "prompt_hash mismatch"
      );
      assert.equal(
        acc.executions.toNumber(),
        0,
        "executions should start at 0"
      );
      assert.equal(acc.fired.toNumber(), 0, "fired should start at 0");
      assert.equal(acc.lastConfidence, 0, "last_confidence should start at 0");
      assert.equal(
        acc.lastExecuted,
        false,
        "last_executed should start as false"
      );
      assert.equal(
        acc.lastDecisionAt.toNumber(),
        0,
        "last_decision_at should start at 0"
      );
      assert.deepEqual(
        Array.from(acc.lastReasoningHash),
        Array.from(new Uint8Array(32)),
        "last_reasoning_hash should start as zero bytes"
      );
    });

    it("stores different prompt_hashes correctly for two rules", async () => {
      const owner = provider.wallet.publicKey;
      const ruleId1 = randomRuleId();
      const ruleId2 = randomRuleId();
      const hash1 = randomHash();
      const hash2 = randomHash();

      const [pda1] = findAgentContextPDA(owner, ruleId1, program.programId);
      const [pda2] = findAgentContextPDA(owner, ruleId2, program.programId);

      await program.methods
        .initialize(Array.from(ruleId1), Array.from(hash1))
        .accounts({
          agentContext: pda1,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .initialize(Array.from(ruleId2), Array.from(hash2))
        .accounts({
          agentContext: pda2,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const acc1 = await program.account.agentContext.fetch(pda1);
      const acc2 = await program.account.agentContext.fetch(pda2);

      assert.deepEqual(Array.from(acc1.promptHash), Array.from(hash1));
      assert.deepEqual(Array.from(acc2.promptHash), Array.from(hash2));
      assert.notDeepEqual(
        Array.from(acc1.ruleId),
        Array.from(acc2.ruleId),
        "PDAs must be distinct"
      );
    });

    it("allows the same rule_id for two different owners (distinct PDAs)", async () => {
      const owner2 = Keypair.generate();

      // Transfer a small amount from your wallet to fund the new keypair.
      await fundFromWallet(provider, owner2.publicKey);

      const ruleId = randomRuleId();
      const promptHash = randomHash();

      const [pda1] = findAgentContextPDA(
        provider.wallet.publicKey,
        ruleId,
        program.programId
      );
      const [pda2] = findAgentContextPDA(
        owner2.publicKey,
        ruleId,
        program.programId
      );

      assert.notEqual(
        pda1.toBase58(),
        pda2.toBase58(),
        "different owners must yield distinct PDAs"
      );

      await program.methods
        .initialize(Array.from(ruleId), Array.from(promptHash))
        .accounts({
          agentContext: pda1,
          owner: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .initialize(Array.from(ruleId), Array.from(promptHash))
        .accounts({
          agentContext: pda2,
          owner: owner2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner2])
        .rpc();

      const acc1 = await program.account.agentContext.fetch(pda1);
      const acc2 = await program.account.agentContext.fetch(pda2);

      assert.ok(acc1.owner.equals(provider.wallet.publicKey));
      assert.ok(acc2.owner.equals(owner2.publicKey));
    });

    it("rejects a second initialize for the same (owner, rule_id) pair", async () => {
      const owner = provider.wallet.publicKey;
      const ruleId = randomRuleId();
      const promptHash = randomHash();
      const [pda] = findAgentContextPDA(owner, ruleId, program.programId);

      await program.methods
        .initialize(Array.from(ruleId), Array.from(promptHash))
        .accounts({
          agentContext: pda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        await program.methods
          .initialize(Array.from(ruleId), Array.from(promptHash))
          .accounts({
            agentContext: pda,
            owner,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Expected double-init to fail");
      } catch (err) {
        assert.ok(err, "Should throw when account already exists");
      }
    });

    it("AgentContext SIZE constant matches actual on-chain account size", async () => {
      const owner = provider.wallet.publicKey;
      const ruleId = randomRuleId();
      const [pda] = findAgentContextPDA(owner, ruleId, program.programId);

      await program.methods
        .initialize(Array.from(ruleId), Array.from(randomHash()))
        .accounts({
          agentContext: pda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const info = await connection.getAccountInfo(pda);
      assert.ok(info !== null, "Account should exist");
      // AgentContext::SIZE = 147; discriminator already included in SIZE
      assert.equal(
        info!.data.length,
        147,
        "on-chain data length should match SIZE constant"
      );
    });
  });

  describe("record_decision", () => {
    let ruleId: Uint8Array;
    let pda: PublicKey;

    // Fresh AgentContext before each test in this suite.
    beforeEach(async () => {
      ruleId = randomRuleId();
      [pda] = findAgentContextPDA(
        provider.wallet.publicKey,
        ruleId,
        program.programId
      );

      await program.methods
        .initialize(Array.from(ruleId), Array.from(randomHash()))
        .accounts({
          agentContext: pda,
          owner: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("records a decision with executed=true and increments both counters", async () => {
      const reasoningHash = randomHash();

      await program.methods
        .recordDecision(85, true, Array.from(reasoningHash))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);

      assert.equal(acc.executions.toNumber(), 1, "executions should be 1");
      assert.equal(
        acc.fired.toNumber(),
        1,
        "fired should be 1 when executed=true"
      );
      assert.equal(acc.lastConfidence, 85);
      assert.equal(acc.lastExecuted, true);
      assert.deepEqual(
        Array.from(acc.lastReasoningHash),
        Array.from(reasoningHash)
      );
      assert.ok(acc.lastDecisionAt.toNumber() > 0, "timestamp must be set");
    });

    it("records a decision with executed=false and does NOT increment fired", async () => {
      await program.methods
        .recordDecision(42, false, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);

      assert.equal(acc.executions.toNumber(), 1);
      assert.equal(
        acc.fired.toNumber(),
        0,
        "fired must stay 0 when executed=false"
      );
      assert.equal(acc.lastConfidence, 42);
      assert.equal(acc.lastExecuted, false);
    });

    it("accumulates three decisions with mixed outcomes correctly", async () => {
      // tick 1: executed=true  → executions=1, fired=1
      await program.methods
        .recordDecision(90, true, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      // tick 2: executed=false → executions=2, fired=1
      await program.methods
        .recordDecision(30, false, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      // tick 3: executed=true  → executions=3, fired=2
      const finalHash = randomHash();
      await program.methods
        .recordDecision(70, true, Array.from(finalHash))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);

      assert.equal(acc.executions.toNumber(), 3, "total decisions should be 3");
      assert.equal(
        acc.fired.toNumber(),
        2,
        "fired should be 2 (ticks 1 and 3)"
      );
      assert.equal(
        acc.lastConfidence,
        70,
        "last confidence should reflect tick 3"
      );
      assert.equal(acc.lastExecuted, true);
      assert.deepEqual(
        Array.from(acc.lastReasoningHash),
        Array.from(finalHash)
      );
    });

    it("overwrites all 'last_*' fields on each new decision", async () => {
      await program.methods
        .recordDecision(99, true, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const hash2 = randomHash();
      await program.methods
        .recordDecision(10, false, Array.from(hash2))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);

      assert.equal(
        acc.lastConfidence,
        10,
        "last_confidence must reflect second call"
      );
      assert.equal(
        acc.lastExecuted,
        false,
        "last_executed must reflect second call"
      );
      assert.deepEqual(
        Array.from(acc.lastReasoningHash),
        Array.from(hash2),
        "last_reasoning_hash must reflect second call"
      );
    });

    it("accepts confidence = 0 (lower boundary)", async () => {
      await program.methods
        .recordDecision(0, false, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);
      assert.equal(acc.lastConfidence, 0);
    });

    it("accepts confidence = 100 (upper boundary)", async () => {
      await program.methods
        .recordDecision(100, true, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);
      assert.equal(acc.lastConfidence, 100);
    });

    it("rejects confidence = 101 with InvalidConfidence (error 6000)", async () => {
      try {
        await program.methods
          .recordDecision(101, false, Array.from(randomHash()))
          .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
          .rpc();
        assert.fail("Expected InvalidConfidence error");
      } catch (err) {
        assert.ok(err instanceof AnchorError, "Expected AnchorError");
        assert.equal(
          (err as AnchorError).error.errorCode.code,
          "InvalidConfidence"
        );
        assert.equal((err as AnchorError).error.errorCode.number, 6000);
      }
    });

    it("rejects confidence = 255 (max u8) with InvalidConfidence (error 6000)", async () => {
      try {
        await program.methods
          .recordDecision(255, true, Array.from(randomHash()))
          .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
          .rpc();
        assert.fail("Expected InvalidConfidence error");
      } catch (err) {
        assert.ok(err instanceof AnchorError, "Expected AnchorError");
        assert.equal((err as AnchorError).error.errorCode.number, 6000);
      }
    });

    it("rejects a call from a non-owner signer with Unauthorized (error 6001)", async () => {
      // A fresh keypair with no SOL is sufficient here — `owner` in RecordDecision
      // is a plain Signer, not a payer, so the tx fails on program logic before
      // any lamport transfer occurs.
      const stranger = Keypair.generate();

      try {
        await program.methods
          .recordDecision(50, true, Array.from(randomHash()))
          .accounts({ agentContext: pda, owner: stranger.publicKey })
          .signers([stranger])
          .rpc();
        assert.fail("Expected Unauthorized error");
      } catch (err) {
        // Surfaces as Unauthorized (6001) if the handler runs, or as
        // ConstraintSeeds (2006) if Anchor rejects the PDA before the handler.
        if (err instanceof AnchorError) {
          const code = (err as AnchorError).error.errorCode.number;
          assert.ok(
            code === 6001 || code === 2006,
            `Expected 6001 or 2006, got ${code}`
          );
        } else {
          assert.ok(err, "Expected some error for an unauthorized signer");
        }
      }
    });

    it("does not mutate state when a transaction is rejected", async () => {
      await program.methods
        .recordDecision(55, true, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const before = await program.account.agentContext.fetch(pda);

      try {
        await program.methods
          .recordDecision(200, false, Array.from(randomHash()))
          .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
          .rpc();
      } catch (_) {
        /* expected */
      }

      const after = await program.account.agentContext.fetch(pda);

      assert.equal(
        after.executions.toNumber(),
        before.executions.toNumber(),
        "executions must not change"
      );
      assert.equal(
        after.fired.toNumber(),
        before.fired.toNumber(),
        "fired must not change"
      );
      assert.equal(
        after.lastConfidence,
        before.lastConfidence,
        "last_confidence must not change"
      );
    });

    it("sets last_decision_at to a unix timestamp close to wall-clock time", async () => {
      const wallBefore = Math.floor(Date.now() / 1000);

      await program.methods
        .recordDecision(75, true, Array.from(randomHash()))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const wallAfter = Math.floor(Date.now() / 1000);
      const acc = await program.account.agentContext.fetch(pda);
      const ts = acc.lastDecisionAt.toNumber();

      assert.ok(
        ts >= wallBefore - 10,
        `timestamp ${ts} should be >= ${wallBefore - 10}`
      );
      assert.ok(
        ts <= wallAfter + 10,
        `timestamp ${ts} should be <= ${wallAfter + 10}`
      );
    });

    it("persists the full 32-byte reasoning_hash verbatim", async () => {
      // Sequential byte pattern makes any off-by-one immediately obvious.
      const reasoningHash = new Uint8Array(32).map((_, i) => i);

      await program.methods
        .recordDecision(60, false, Array.from(reasoningHash))
        .accounts({ agentContext: pda, owner: provider.wallet.publicKey })
        .rpc();

      const acc = await program.account.agentContext.fetch(pda);
      assert.deepEqual(
        Array.from(acc.lastReasoningHash),
        Array.from(reasoningHash),
        "Full 32-byte reasoning hash must round-trip unchanged"
      );
    });
  });

  describe("PDA derivation", () => {
    it("is deterministic — same inputs yield the same PDA", () => {
      const owner = provider.wallet.publicKey;
      const ruleId = randomRuleId();

      const [pda1] = findAgentContextPDA(owner, ruleId, program.programId);
      const [pda2] = findAgentContextPDA(owner, ruleId, program.programId);

      assert.equal(pda1.toBase58(), pda2.toBase58());
    });

    it("produces distinct PDAs for different rule_ids under the same owner", () => {
      const owner = provider.wallet.publicKey;
      const [pda1] = findAgentContextPDA(
        owner,
        randomRuleId(),
        program.programId
      );
      const [pda2] = findAgentContextPDA(
        owner,
        randomRuleId(),
        program.programId
      );

      assert.notEqual(pda1.toBase58(), pda2.toBase58());
    });

    it("produces distinct PDAs for the same rule_id across different owners", () => {
      const ruleId = randomRuleId();
      const [pda1] = findAgentContextPDA(
        Keypair.generate().publicKey,
        ruleId,
        program.programId
      );
      const [pda2] = findAgentContextPDA(
        Keypair.generate().publicKey,
        ruleId,
        program.programId
      );

      assert.notEqual(pda1.toBase58(), pda2.toBase58());
    });

    it("on-chain PDA matches off-chain derivation after initialize", async () => {
      const owner = provider.wallet.publicKey;
      const ruleId = randomRuleId();
      const [expectedPda] = findAgentContextPDA(
        owner,
        ruleId,
        program.programId
      );

      await program.methods
        .initialize(Array.from(ruleId), Array.from(randomHash()))
        .accounts({
          agentContext: expectedPda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const acc = await program.account.agentContext.fetch(expectedPda);
      assert.ok(acc.owner.equals(owner));
    });
  });

  describe("delegate & commit (Ephemeral Rollup environment only)", () => {
    /**
     * These instructions depend on the MagicBlock delegation program and an
     * Ephemeral Rollup validator. They are intentionally skipped on plain devnet.
     * To run them, point ANCHOR_PROVIDER_URL at an ER-enabled cluster and
     * remove the `.skip`.
     */

    it.skip("delegates AgentContext PDA to the ER after initialize", async () => {
      const owner = provider.wallet.publicKey;
      const ruleId = randomRuleId();
      const [pda] = findAgentContextPDA(owner, ruleId, program.programId);

      await program.methods
        .initialize(Array.from(ruleId), Array.from(randomHash()))
        .accounts({
          agentContext: pda,
          owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .delegate(Array.from(ruleId))
        .accounts({ owner, agentContext: pda })
        .rpc();

      const info = await connection.getAccountInfo(pda);
      assert.ok(info !== null);
      assert.notEqual(
        info!.owner.toBase58(),
        program.programId.toBase58(),
        "PDA should be transferred to delegation program"
      );
    });

    it.skip("commit pushes ER state to base layer without undelegating", async () => {
      // 1. initialize → delegate → record_decision (on ER) → commit
      // Assert: base-layer account reflects ER writes; delegation still active.
    });

    it.skip("commit_and_undelegate settles ER state and revokes delegation", async () => {
      // 1. initialize → delegate → record_decision (on ER) → commit_and_undelegate
      // Assert: base-layer account reflects ER writes; owner returned to program.
    });
  });
});
