import { Keypair, Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "./config.js";

export function loadAgentKeypair(): Keypair {
  return Keypair.fromSecretKey(bs58.decode(config.agentPrivateKey));
}

export function getConnection(): Connection {
  return new Connection(config.heliusRpcUrl, "confirmed");
}
