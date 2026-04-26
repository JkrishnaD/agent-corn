import { AgentLoop } from "./loop.js";
import { startServer } from "./server.js";
import { loadAgentKeypair } from "./wallet.js";

async function main() {
  const kp = loadAgentKeypair();
  console.log(`[agent] wallet ${kp.publicKey.toBase58()}`);

  const loop = new AgentLoop();
  startServer(loop);
  await loop.start();
  console.log("[agent] running");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
