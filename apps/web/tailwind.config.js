/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#090d16",
          ground: "#090d16",
        },
        panel: {
          DEFAULT: "#131b2e",
          low: "#0f1523",
          high: "#1a243b",
          highest: "#222f4c",
        },
        border: {
          solid: "#25334d",
          muted: "#1a243b",
          focus: "#4f46e5",
        },
        accent: {
          indigo: "#4f46e5",
          "indigo-hover": "#4338ca",
          cyan: "#0891b2",
          emerald: "#059669",
          amber: "#d97706",
          rose: "#dc2626",
        },
        content: {
          primary: "#f8fafc",
          muted: "#94a3b8",
          tertiary: "#475569",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"]
      }
    },
  },
  plugins: [],
};
