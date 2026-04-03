import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f6f8fb",
        card: "#ffffff",
        border: "#e6ebf2",
        ink: "#0f172a",
        muted: "#64748b",
        blue: "#2563eb",
        green: "#059669",
        violet: "#7c3aed",
      },
    },
  },
  plugins: [],
};

export default config;
