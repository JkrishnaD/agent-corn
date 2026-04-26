use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder};

use crate::constants::AGENT_SEED;
use crate::state::AgentContext;

/// Manual settle: push current ER state to base layer, keep delegation.
/// Useful to cement an audit checkpoint without losing ER routing.
pub fn commit_handler(ctx: Context<CommitOrUndelegate>) -> Result<()> {
    ctx.accounts.agent_context.exit(&crate::ID)?;
    MagicIntentBundleBuilder::new(
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit(&[ctx.accounts.agent_context.to_account_info()])
    .build_and_invoke()?;
    Ok(())
}

/// Final settle: push current ER state to base layer AND return ownership
/// to this program. Call when the rule is paused or deleted.
pub fn commit_and_undelegate_handler(ctx: Context<CommitOrUndelegate>) -> Result<()> {
    ctx.accounts.agent_context.exit(&crate::ID)?;
    MagicIntentBundleBuilder::new(
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit_and_undelegate(&[ctx.accounts.agent_context.to_account_info()])
    .build_and_invoke()?;
    Ok(())
}

/// `#[commit]` injects the `magic_context` and `magic_program` accounts
/// needed by the MagicBlock commit CPI.
#[commit]
#[derive(Accounts)]
pub struct CommitOrUndelegate<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [AGENT_SEED, owner.key().as_ref(), agent_context.rule_id.as_ref()],
        bump = agent_context.bump,
    )]
    pub agent_context: Account<'info, AgentContext>,
}
