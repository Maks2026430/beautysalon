import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    // Mobile-first breakpoints per spec: 375 / 768 / 1280.
    screens: {
      xs: "375px",
      md: "768px",
      xl: "1280px",
    },
    extend: {
      colors: {
        cream: "#F7F1EA",
        espresso: "#2E2A26",
        taupe: "#B8A99A",
        // Основной акцент — мауве-роза. Гармонирует со сливовым (одна холодная
        // розово-ягодная семья); пришла на смену прежней терракоте по всему сайту.
        accent: {
          DEFAULT: "#A85D6E",
          dark: "#8C4A5A",
        },
        // Второй акцент — благородный сливовый. Используется в тёмной секции,
        // бейджах и цветовом кодировании карточек.
        plum: {
          DEFAULT: "#6E3D52",
          dark: "#532D3F",
        },
        // Светлый розовый тинт для фонов секций.
        rose: "#E9D9DE",
        sand: "#E5DACE",
      },
      fontFamily: {
        // Bound to next/font CSS variables in app/layout.tsx.
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1280px",
      },
      letterSpacing: {
        widest2: "0.22em",
      },
    },
  },
  plugins: [],
};

export default config;
