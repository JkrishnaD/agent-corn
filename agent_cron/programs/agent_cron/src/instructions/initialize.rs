use anchor_lang::prelude::*;

use crate::constants::AGENT_SEED;
use crate::state::AgentContext;

/// Create the AgentContext PDA for a rule. Runs on base layer once per rule.
pub fn handler(
    ctx: Context<InitializeAgent>,
    rule_id: [u8; 16],
    prompt_hash: [u8; 32],
) -> Result<()> {
    let ctx_acc = &mut ctx.accounts.agent_context;
    ctx_acc.owner = ctx.accounts.owner.key();
    ctx_acc.rule_id = rule_id;
    ctx_acc.prompt_hash = prompt_hash;
    ctx_acc.executions = 0;
    ctx_acc.fired = 0;
    ctx_acc.last_confidence = 0;
    ctx_acc.last_executed = false;
    ctx_acc.last_decision_at = 0;
    ctx_acc.last_reasoning_hash = [0u8; 32];
    ctx_acc.bump = ctx.bumps.agent_context;

    msg!("agent_cron: init rule={:?} owner={}", rule_id, ctx_acc.owner);
    Ok(())
}

#[derive(Accounts)]
#[instruction(rule_id: [u8; 16])]
pub struct InitializeAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = AgentContext::SIZE,
        seeds = [AGENT_SEED, owner.key().as_ref(), rule_id.as_ref()],
        bump,
    )]
    pub agent_context: Account<'info, AgentContext>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
