use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

use crate::constants::AGENT_SEED;

/// Delegate the AgentContext PDA to the MagicBlock delegation program.
/// After this, `record_decision` writes are routed to the ER endpoint.
pub fn handler(ctx: Context<DelegateAgent>, rule_id: [u8; 16]) -> Result<()> {
    let owner_key = ctx.accounts.owner.key();
    ctx.accounts.delegate_agent_context(
        &ctx.accounts.owner,
        &[AGENT_SEED, owner_key.as_ref(), rule_id.as_ref()],
        DelegateConfig {
            // Pin a specific validator if passed as the first remaining account.
            validator: ctx.remaining_accounts.first().map(|a| a.key()),
            ..Default::default()
        },
    )?;
    Ok(())
}

/// `#[delegate]` injects the helper `delegate_agent_context()` and the
/// remaining accounts (delegation program, buffer, record, metadata) needed
/// by the MagicBlock delegation CPI.
#[delegate]
#[derive(Accounts)]
#[instruction(rule_id: [u8; 16])]
pub struct DelegateAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: PDA validated by the delegation program. Must be the agent
    /// context for `(owner, rule_id)`.
    #[account(
        mut,
        del,
        seeds = [AGENT_SEED, owner.key().as_ref(), rule_id.as_ref()],
        bump,
    )]
    pub agent_context: AccountInfo<'info>,
}
