import type { Config } from "tailwindcss";

// NexusAI design tokens — locked to the Figma "Nexus System" board (v0.1/v0.2).
// Role names are preserved so existing utility classes keep working; only the
// hex values are updated to the Figma source of truth, plus two additive
// tokens (surface, sky) and the philosophy-mandated AI accent (ai = violet).
// Source: Figma file NcQ8F5a0hczwGwZua2gfun + Design Philosophy v1.5.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#080d18",      // Figma: Background — command-layer base
          surface: "#0b1220", // Figma: Surface — secondary dark surface (NEW)
          panel: "#101827",   // Figma: Panel — working panel
          border: "#263249",  // Figma: Border
          text: "#f7faff",    // Figma: Text — near-white, AA contrast
          muted: "#a8b3c7",   // Figma: Muted — captions / metadata
          accent: "#64d8c4",  // Figma: Accent — mint, primary action / verified
          warn: "#f3c969",    // Figma: Amber — human review / approval gate
          danger: "#f08aa0",  // Figma: Rose — escalation / blocked / high risk
          sky: "#8fc5ff",     // Figma: Sky — evidence / metric highlight (NEW)
          ai: "#7a3ff2"       // Philosophy v1.5: Violet — AI-generated only (NEW)
        }
      }
    }
  },
  plugins: []
};

export default config;
