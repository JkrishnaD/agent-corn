import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

export interface ReasoningInput {
  rulePrompt: string;
  triggerEvent: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface ReasoningResult {
  shouldExecute: boolean;
  reasoning: string;
  confidence: number; // 0..1
}

const SYSTEM = `You are AgentCron's reasoning brain. You decide whether an autonomous on-chain action should fire given a fuzzy rule, a trigger event, and live chain context.

Output STRICT JSON only:
{ "shouldExecute": boolean, "reasoning": "1-2 sentence explanation", "confidence": 0.0-1.0 }

Rules:
- Be conservative. If unclear, do not execute.
- Reasoning must be specific to the data, not generic.
- Confidence < 0.7 should generally not execute unless the rule explicitly tolerates noise.`;

export async function reasonAboutTrigger(
  input: ReasoningInput
): Promise<ReasoningResult> {
  const userMsg = `Rule: ${input.rulePrompt}

Trigger event:
${JSON.stringify(input.triggerEvent, null, 2)}

Live context:
${JSON.stringify(input.context, null, 2)}

Should the action execute? Respond with JSON only.`;

  const resp = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  // Extract JSON even if wrapped in prose
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      shouldExecute: false,
      reasoning: "LLM returned no JSON",
      confidence: 0,
    };
  }
  try {
    const parsed = JSON.parse(match[0]) as ReasoningResult;
    return parsed;
  } catch {
    return {
      shouldExecute: false,
      reasoning: "LLM JSON parse failed",
      confidence: 0,
    };
  }
}
