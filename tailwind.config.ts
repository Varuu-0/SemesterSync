import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font, ui-sans-serif)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "rgb(var(--ink-50-rgb) / <alpha-value>)",
          100: "rgb(var(--ink-100-rgb) / <alpha-value>)",
          200: "rgb(var(--ink-200-rgb) / <alpha-value>)",
          300: "rgb(var(--ink-300-rgb) / <alpha-value>)",
          400: "rgb(var(--ink-400-rgb) / <alpha-value>)",
          500: "rgb(var(--ink-500-rgb) / <alpha-value>)",
          600: "rgb(var(--ink-600-rgb) / <alpha-value>)",
          700: "rgb(var(--ink-700-rgb) / <alpha-value>)",
          800: "rgb(var(--ink-800-rgb) / <alpha-value>)",
          900: "rgb(var(--ink-900-rgb) / <alpha-value>)",
        },
        surface:
          "rgb(var(--surface-rgb) / calc(<alpha-value> * var(--mesh-surface-alpha, 1)))",
        "surface-strong":
          "rgb(var(--surface-strong-rgb) / calc(<alpha-value> * var(--mesh-surface-strong-alpha, 1)))",
        /** Solid panels (e.g. theme menu); ignores mesh frosted multipliers */
        "surface-opaque": "rgb(var(--surface-rgb) / <alpha-value>)",
        primary: "rgb(var(--primary-rgb) / <alpha-value>)",
        "primary-fg": "rgb(var(--primary-fg-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
      },
      boxShadow: {
        soft: "var(--shadow-soft, 0 1px 2px rgba(16, 16, 26, 0.04), 0 4px 12px rgba(16, 16, 26, 0.06))",
      },
    },
  },
  plugins: [],
};

export default config;
