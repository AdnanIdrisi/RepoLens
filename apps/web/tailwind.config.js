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
          light: "#FAF9F6",
          dark: "#0A1114",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#111B20",
        },
        subtle: {
          light: "#F3F4F6",
          dark: "#0D1519",
        },
        hairline: {
          light: "#E5E7EB",
          dark: "#1E2D35",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "'Inter'", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
