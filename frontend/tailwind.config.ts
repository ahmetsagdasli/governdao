import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAF8F4",
        surface: "#FFFFFF",
        surface2: "#F3F0EA",
        border: "#E7E2D8",
        ink: "#221F26",
        muted: "#726D78",
        accent: "#4C3FCB",
        accentHover: "#3C31A8",
        success: "#15803D",
        danger: "#B91C1C",
        warn: "#B45309",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
