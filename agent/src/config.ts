import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load .env from monorepo root (cwd at runtime is `agent/`).
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env"), override: true });

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export const config = {
  network: process.env.SOLANA_NETWORK ?? "devnet",
  heliusApiKey: process.env.HELIUS_API_KEY ?? "",
  heliusRpcUrl: process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com",
  agentPrivateKey: required("SOLANA_PRIVATE_KEY"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  magicBlockRpcUrl:
    process.env.MAGICBLOCK_RPC_URL ?? "https://devnet.magicblock.app",
  wsPort: Number(process.env.AGENT_WS_PORT ?? 4000),
  agentCronProgramId:
    process.env.AGENT_CRON_PROGRAM_ID ??
    "CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC",
};
