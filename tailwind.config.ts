import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e5ff",
          400: "#6d94ff",
          500: "#4b6fe8",
          600: "#3a55bf",
          700: "#2e4396",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
