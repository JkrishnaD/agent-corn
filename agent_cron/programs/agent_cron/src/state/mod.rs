use anchor_lang::prelude::*;

/// Per-rule on-chain state. Lives on base layer until delegated to MagicBlock.
/// While delegated, `record_decision` writes happen on the Ephemeral Rollup
/// (sub-50ms) and either auto-commit or are settled via `commit_state` /
/// `commit_and_undelegate_state`.
///
/// Only hashes are stored — full reasoning text remains off-chain. The hash
/// proves the agent did not retroactively rewrite the prompt or rationale.
#[account]
pub struct AgentContext {
    /// Wallet that owns the rule (and only one allowed to mutate state).
    pub owner: Pubkey,
    /// 16-byte UUID of the rule (matches the off-chain Rule.id).
    pub rule_id: [u8; 16],
    /// SHA-256 of the user's reasoning prompt at rule-creation time.
    pub prompt_hash: [u8; 32],
    /// Total number of LLM decisions recorded against this rule.
    pub executions: u64,
    /// Number of decisions where the LLM said "execute".
    pub fired: u64,
    /// Confidence (0..=100) of the most recent decision.
    pub last_confidence: u8,
    /// Whether the most recent decision resulted in an action.
    pub last_executed: bool,
    /// Unix timestamp (seconds) of the most recent decision.
    pub last_decision_at: i64,
    /// SHA-256 of the most recent reasoning rationale text.
    pub last_reasoning_hash: [u8; 32],
    /// Bump for the PDA derivation.
    pub bump: u8,
}

impl AgentContext {
    // 8 disc + 32 owner + 16 rule_id + 32 prompt_hash + 8 executions
    //   + 8 fired + 1 confidence + 1 executed + 8 ts + 32 reasoning_hash + 1 bump
    pub const SIZE: usize = 8 + 32 + 16 + 32 + 8 + 8 + 1 + 1 + 8 + 32 + 1;
}
