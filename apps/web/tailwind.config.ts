import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Cartistry — tonos neutros sofisticados
        "cartistry-bg": "#F5F0EB", // Hueso / Off-white
        "cartistry-bg-secondary": "#E8DDD3", // Arena cálida
        "cartistry-surface": "#FAF7F4", // Blanco roto
        "cartistry-accent": "#7C6B5E", // Taupe oscuro
        "cartistry-accent-secondary": "#A08872", // Marrón medio
        "cartistry-text": "#2C1F14", // Marrón muy oscuro
        "cartistry-text-secondary": "#6B5744", // Marrón medio-claro
        "cartistry-border": "#D4C4B5", // Arena suave
        "cartistry-cta": "#3D2B1F", // Marrón oscuro
        "cartistry-cta-text": "#F5F0EB", // Hueso
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
