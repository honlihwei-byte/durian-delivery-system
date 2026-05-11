import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        drive: {
          bg: "#f4f6f3",
          surface: "#ffffff",
          accent: "#1e6b4a",
          accentMuted: "#2d8a62",
          ink: "#1a1f1c",
          muted: "#5c6560",
          line: "#dfe6e1",
          warn: "#c45c26",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
