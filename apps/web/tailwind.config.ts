import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        "callo-bg": "#09090B",
        "callo-bg-deep": "#0E0E13",

        // Card / surface layers
        "callo-surface": "#131318",
        "callo-surface-light": "#1A1A22",

        // Borders
        "callo-border": "#27272A",
        "callo-border-light": "#3F3F46",

        // Primary accent (electric blue / indigo)
        "callo-accent": "#6366F1",
        "callo-accent-light": "#818CF8",
        "callo-accent-muted": "#4F46E5",

        // Text
        "callo-text": "#FAFAFA",
        "callo-text-secondary": "#A1A1AA",
        "callo-text-muted": "#71717A",

        // Semantic
        "callo-success": "#22C55E",
        "callo-warning": "#F59E0B",
        "callo-error": "#EF4444",

        // Legacy tokens (CSS variable-based)
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: [
          "var(--font-jetbrains-mono)",
          "JetBrains Mono",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        "callo-sm": "6px",
        "callo-md": "8px",
        "callo-lg": "12px",
        "callo-xl": "16px",
      },
      boxShadow: {
        "callo-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
        "callo-md":
          "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)",
        "callo-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)",
        "callo-glow": "0 0 20px rgba(99, 102, 241, 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
