import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#0b1220",
          panel: "#101a2f",
          border: "#2a3654",
          text: "#dbe7ff",
          muted: "#9db0d1",
          accent: "#2ed3b7",
          warn: "#f0b429",
          danger: "#ef6b73"
        }
      }
    }
  },
  plugins: []
};

export default config;
