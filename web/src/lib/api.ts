import type { Rule, AgentEvent, AgentStatus } from "@agent-corn/shared";

const BASE = process.env.NEXT_PUBLIC_AGENT_API_URL ?? "http://localhost:4000";
const WS = process.env.NEXT_PUBLIC_AGENT_WS_URL ?? "ws://localhost:4000";

export async function getStatus(): Promise<AgentStatus> {
  const r = await fetch(`${BASE}/status`);
  return r.json();
}

export async function listRules(): Promise<Rule[]> {
  const r = await fetch(`${BASE}/rules`);
  return r.json();
}

export async function createRule(rule: Rule): Promise<Rule> {
  const r = await fetch(`${BASE}/rules`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rule),
  });
  return r.json();
}

export async function deleteRule(id: string): Promise<void> {
  await fetch(`${BASE}/rules/${id}`, { method: "DELETE" });
}

export async function toggleRule(id: string, enabled: boolean): Promise<Rule> {
  const r = await fetch(`${BASE}/rules/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  return r.json();
}

export function subscribeEvents(
  onEvent: (e: AgentEvent) => void,
  onSnapshot: (e: AgentEvent[]) => void
) {
  const ws = new WebSocket(WS);
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.kind === "snapshot") onSnapshot(data.events);
    if (data.kind === "event") onEvent(data.event);
  };
  return () => ws.close();
}
