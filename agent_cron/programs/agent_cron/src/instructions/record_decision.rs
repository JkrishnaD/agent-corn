use anchor_lang::prelude::*;

use crate::constants::AGENT_SEED;
use crate::error::AgentError;
use crate::state::AgentContext;

/// Record one LLM decision against the rule. Designed to run on the ER
/// while the AgentContext PDA is delegated — sub-50ms per call.
///
/// The agent passes:
///   - confidence: 0..=100 (LLM-reported)
///   - executed:   whether the agent actually fired the action
///   - reasoning_hash: SHA-256 of the rationale text (privacy: text stays off-chain)
pub fn handler(
    ctx: Context<RecordDecision>,
    confidence: u8,
    executed: bool,
    reasoning_hash: [u8; 32],
) -> Result<()> {
    require!(confidence <= 100, AgentError::InvalidConfidence);

    let ctx_acc = &mut ctx.accounts.agent_context;
    require_keys_eq!(ctx_acc.owner, ctx.accounts.owner.key(), AgentError::Unauthorized);

    ctx_acc.executions = ctx_acc.executions.saturating_add(1);
    if executed {
        ctx_acc.fired = ctx_acc.fired.saturating_add(1);
    }
    ctx_acc.last_confidence = confidence;
    ctx_acc.last_executed = executed;
    ctx_acc.last_decision_at = Clock::get()?.unix_timestamp;
    ctx_acc.last_reasoning_hash = reasoning_hash;

    msg!(
        "agent_cron: tick #{} fired={} conf={}",
        ctx_acc.executions,
        executed,
        confidence,
    );
    Ok(())
}

#[derive(Accounts)]
pub struct RecordDecision<'info> {
    #[account(
        mut,
        seeds = [AGENT_SEED, owner.key().as_ref(), agent_context.rule_id.as_ref()],
        bump = agent_context.bump,
    )]
    pub agent_context: Account<'info, AgentContext>,
    pub owner: Signer<'info>,
}
