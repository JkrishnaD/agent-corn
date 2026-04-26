use anchor_lang::prelude::*;

#[error_code]
pub enum AgentError {
    #[msg("confidence must be in 0..=100")]
    InvalidConfidence,
    #[msg("only the rule owner can call this instruction")]
    Unauthorized,
}
