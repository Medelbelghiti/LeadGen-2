import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdbff",
          300: "#8ec4ff",
          400: "#59a2ff",
          500: "#337dfb",
          600: "#1d5df0",
          700: "#1548dd",
          800: "#183cb3",
          900: "#19388d",
          950: "#142455",
        },
      },
    },
  },
  plugins: [],
};

export default config;
