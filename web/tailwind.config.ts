import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#040814",
        surface: "#070D1F",
        panel: "#0A1428",
        raised: "#0F2854",
        line: "rgba(189,232,245,0.08)",
        edge: "rgba(189,232,245,0.14)",
        navy: "#0F2854",
        mid: "#1C4D8D",
        sky: "#4988C4",
        ice: "#BDE8F5",
        accent: "#4988C4",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      animation: {
        "glow-pulse": "glowPulse 14s ease-in-out infinite",
        "drift": "drift 18s ease-in-out infinite",
        "shimmer": "shimmer 2.4s linear infinite",
        "fade-up": "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { opacity: "0.6", transform: "translate(-50%,0) scale(1)" },
          "50%": { opacity: "0.75", transform: "translate(-50%,0) scale(1.04)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(2%,-2%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "halftone": "radial-gradient(rgba(189,232,245,0.18) 1px, transparent 1px)",
        "brand-fade": "linear-gradient(135deg,#4988C4 0%,#BDE8F5 100%)",
        "brand-deep": "linear-gradient(135deg,#0F2854 0%,#1C4D8D 50%,#4988C4 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
