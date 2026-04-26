import "./globals.css";
import { Geist, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { WalletContextProvider } from "@/lib/wallet-provider";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata = {
  title: "AgentCron — Autonomous Onchain Execution",
  description:
    "AI agents that reason about chain conditions and execute privately on MagicBlock Ephemeral Rollups.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <body>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
