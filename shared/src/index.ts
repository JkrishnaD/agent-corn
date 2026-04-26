// Shared types between agent runtime and web dashboard

export type TriggerType =
  | "chain_event"
  | "balance"
  | "price"
  | "time"
  | "webhook";

export type ActionType = "swap" | "transfer" | "mint" | "delegate" | "custom";

export type Privacy = "public" | "private";

export interface RuleTrigger {
  type: TriggerType;
  params: Record<string, unknown>;
}

export interface RuleAction {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface Rule {
  id: string;
  ownerWallet: string; // user wallet that owns this rule
  agentNft: string | null; // Metaplex Core agent identity NFT mint
  name: string;
  trigger: RuleTrigger;
  reasoningPrompt: string; // natural-language fuzzy match for the LLM
  action: RuleAction;
  privacy: Privacy;
  enabled: boolean;
  createdAt: number;
}

export type AgentEventType =
  | "monitor_check"
  | "trigger_fired"
  | "reasoning_started"
  | "reasoning_decision"
  | "action_delegating"
  | "action_executing"
  | "action_settled"
  | "error";

export interface AgentEvent {
  id: string;
  ruleId: string;
  ts: number;
  type: AgentEventType;
  payload: Record<string, unknown>;
  txSignature?: string;
  reasoning?: string;
}

export interface AgentStatus {
  running: boolean;
  paused: boolean;
  agentWallet: string;
  rulesActive: number;
  lastEvent: AgentEvent | null;
}
