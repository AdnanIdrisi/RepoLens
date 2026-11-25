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
          ground: "#060910",
        },
        panel: {
          DEFAULT: "#0f172a",
          low: "#090d16",
          high: "#161f30",
          highest: "#1e293b",
        },
        border: {
          solid: "#1e293b",
          muted: "#161f30",
          focus: "#6366f1",
        },
        accent: {
          indigo: "#6366f1",
          "indigo-hover": "#818cf8",
          "indigo-light": "rgba(99, 102, 241, 0.15)",
          cyan: "#38bdf8",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
        content: {
          primary: "#f8fafc",
          muted: "#94a3b8",
          tertiary: "#64748b",
        }
      },
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "'Inter'", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "Fira Code", "monospace"]
      }
    },
  },
  plugins: [],
};
