import type { Config } from "tailwindcss";

// Sistema de tokens — Sección 2.3 del PRD de Aethelgard.
// Los valores viven como variables CSS en app/globals.css y se exponen aquí
// para poder usarlos como clases de utilidad (bg-void, text-secondary, etc.)
// sin nunca hardcodear hex sueltos en los componentes.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "var(--surface-void)",
        raised: "var(--surface-raised)",
        overlay: "var(--surface-overlay)",
        hairline: "var(--border-hairline)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        accent: "var(--accent-functional)",
        elevated: "var(--signal-elevated)",
        critical: "var(--signal-critical)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
