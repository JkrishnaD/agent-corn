// WebSocket + HTTP API for the dashboard.
// HTTP: POST /rules, GET /rules, DELETE /rules/:id, GET /status
// WS:   broadcasts AgentEvent stream

import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import type { Rule, AgentEvent, AgentStatus } from "@agent-corn/shared";
import { AgentLoop } from "./loop.js";
import { config } from "./config.js";
import { loadAgentKeypair } from "./wallet.js";
import { initializeAndDelegate, commitAndUndelegate } from "./program.js";

export function startServer(loop: AgentLoop) {
  const wsServer = new WebSocketServer({ noServer: true });
  const eventLog: AgentEvent[] = [];
  loop.on((e) => {
    eventLog.push(e);
    if (eventLog.length > 500) eventLog.shift();
    const msg = JSON.stringify({ kind: "event", event: e });
    for (const c of wsServer.clients) if (c.readyState === 1) c.send(msg);
  });

  const http = createServer(async (req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.end();

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/status") {
      const status: AgentStatus = {
        running: true,
        paused: loop.isPaused(),
        agentWallet: loadAgentKeypair().publicKey.toBase58(),
        rulesActive: loop.listRules().filter((r) => r.enabled).length,
        lastEvent: eventLog.at(-1) ?? null,
      };
      return json(res, 200, status);
    }

    if (req.method === "POST" && url.pathname === "/agent/pause") {
      loop.pause();
      return json(res, 200, { paused: true });
    }

    if (req.method === "POST" && url.pathname === "/agent/resume") {
      loop.resume();
      return json(res, 200, { paused: false });
    }

    if (req.method === "GET" && url.pathname === "/rules") {
      return json(res, 200, loop.listRules());
    }

    if (req.method === "POST" && url.pathname === "/rules") {
      const body = await readBody(req);
      const rule = body as Rule;
      loop.addRule(rule);
      // Fire-and-forget on-chain init+delegate. POST returns fast; events
      // surface in the timeline as the calls land.
      void (async () => {
        loop.emit({
          ruleId: rule.id,
          type: "action_delegating",
          payload: { kind: "init_and_delegate_started" },
        });
        try {
          const r = await initializeAndDelegate({
            ruleId: rule.id,
            reasoningPrompt: rule.reasoningPrompt,
          });
          loop.emit({
            ruleId: rule.id,
            type: "action_settled",
            payload: {
              kind: "init_and_delegate",
              route: "magicblock",
              pda: r.pda,
              initSig: r.initSig,
              delegateSig: r.delegateSig,
              durationMs: r.durationMs,
            },
            txSignature:
              r.initSig && r.initSig !== "already-initialized"
                ? r.initSig
                : undefined,
          });
        } catch (e) {
          loop.emit({
            ruleId: rule.id,
            type: "error",
            payload: { kind: "init_and_delegate_failed", msg: String(e) },
          });
        }
      })();
      return json(res, 201, rule);
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/rules/")) {
      const id = url.pathname.split("/").pop()!;
      loop.removeRule(id);
      void (async () => {
        try {
          const r = await commitAndUndelegate({ ruleId: id });
          loop.emit({
            ruleId: id,
            type: "action_settled",
            payload: {
              kind: "commit_and_undelegate",
              route: "magicblock",
              pda: r.pda,
              sig: r.sig,
              commitmentSig: r.commitmentSig,
            },
            txSignature: r.sig,
          });
        } catch (e) {
          loop.emit({
            ruleId: id,
            type: "error",
            payload: { kind: "commit_and_undelegate_failed", msg: String(e) },
          });
        }
      })();
      return json(res, 204, null);
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/rules/")) {
      const id = url.pathname.split("/").pop()!;
      const body = (await readBody(req)) as { enabled?: boolean };
      if (typeof body.enabled !== "boolean")
        return json(res, 400, { error: "enabled (bool) required" });
      const updated = loop.setEnabled(id, body.enabled);
      if (!updated) return json(res, 404, { error: "rule not found" });
      return json(res, 200, updated);
    }

    if (req.method === "GET" && url.pathname === "/events") {
      return json(res, 200, eventLog);
    }

    res.statusCode = 404;
    res.end();
  });

  http.on("upgrade", (req, sock, head) => {
    wsServer.handleUpgrade(req, sock, head, (ws) => {
      wsServer.emit("connection", ws, req);
      ws.send(JSON.stringify({ kind: "snapshot", events: eventLog }));
    });
  });

  http.listen(config.wsPort, () => {
    console.log(`[agent] http+ws on :${config.wsPort}`);
    console.log(`[agent] program ${config.agentCronProgramId}`);
  });
}

function json(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown
) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(body === null ? "" : JSON.stringify(body));
}

async function readBody(
  req: import("node:http").IncomingMessage
): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
