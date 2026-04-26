// AgentCron — on-chain proof-of-reasoning for autonomous Solana agents.
//
// Each rule has an AgentContext PDA. The off-chain agent records every LLM
// decision (confidence, executed-or-not, reasoning hash) into this PDA.
//
// Lifecycle:
//   1. initialize          — base layer, create PDA per (owner, rule_id)
//   2. delegate            — base layer, hand PDA ownership to MB delegation program
//   3. record_decision …   — ER endpoint, sub-50ms per tick (auto-commit at commit_frequency_ms)
//   4. commit              — manual settle to base, keep delegation
//   5. commit_and_undelegate — final settle + return ownership
//
// Inspired by:
//   - magicblock-labs/magicblock-engine-examples/anchor-counter (ER macros)
//   - magicblock-labs/super-smart-contracts (on-chain agent context pattern)

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC");

#[ephemeral]
#[program]
pub mod agent_cron {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeAgent>,
        rule_id: [u8; 16],
        prompt_hash: [u8; 32],
    ) -> Result<()> {
        instructions::initialize::handler(ctx, rule_id, prompt_hash)
    }

    pub fn delegate(ctx: Context<DelegateAgent>, rule_id: [u8; 16]) -> Result<()> {
        instructions::delegate::handler(ctx, rule_id)
    }

    pub fn record_decision(
        ctx: Context<RecordDecision>,
        confidence: u8,
        executed: bool,
        reasoning_hash: [u8; 32],
    ) -> Result<()> {
        instructions::record_decision::handler(ctx, confidence, executed, reasoning_hash)
    }

    pub fn commit(ctx: Context<CommitOrUndelegate>) -> Result<()> {
        instructions::commit::commit_handler(ctx)
    }

    pub fn commit_and_undelegate(ctx: Context<CommitOrUndelegate>) -> Result<()> {
        instructions::commit::commit_and_undelegate_handler(ctx)
    }
}
