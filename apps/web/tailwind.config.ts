import type { Config } from "tailwindcss";

/**
 * Sistema de diseño Cartistry — "instrumento de retail".
 *
 * Regla que gobierna la paleta: el color significa rendimiento.
 * La interfaz es tinta sobre papel; la única gama cromática es la escala
 * de calor del planograma (frío = stock parado, caliente = best seller).
 * Si algo tiene color, es un dato. Si es cromo decorativo, sobra.
 *
 * Los tokens `cartistry-*` se conservan como alias para que las páginas
 * ya escritas hereden el sistema nuevo sin tocarlas una a una.
 */

const paper = "#EDEDE8"; // papel de etiqueta
const surface = "#FFFFFF"; // balda blanca
const sunk = "#E3E3DD"; // hueco / pista de la rejilla
const line = "#D6D6CF"; // canto de balda
const lineStrong = "#B4B4AB";
const ink = "#15171A"; // tinta
const ink2 = "#585C63";
const ink3 = "#8B8F96";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper,
        surface,
        sunk,
        line,
        "line-strong": lineStrong,
        ink,
        "ink-2": ink2,
        "ink-3": ink3,

        // Escala de calor — el único cromatismo del sistema.
        heat: {
          0: "#1F4E79", // parado
          1: "#5B93B5",
          2: "#D9D3BC", // templado
          3: "#E0A03C",
          4: "#C2402F", // caliente
        },

        // Señales. Se encienden solo cuando hay algo que hacer.
        signal: "#E0A03C",
        danger: "#C2402F",
        positive: "#2F6F5E",

        // Alias heredados: mismas claves, valores nuevos.
        "cartistry-bg": paper,
        "cartistry-bg-secondary": sunk,
        "cartistry-surface": surface,
        "cartistry-accent": ink,
        "cartistry-accent-secondary": ink2,
        "cartistry-text": ink,
        "cartistry-text-secondary": ink2,
        "cartistry-border": line,
        "cartistry-cta": ink,
        "cartistry-cta-text": surface,
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        // Las páginas existentes titulan con `font-serif`: lo redirigimos
        // a la display para que hereden la tipografía nueva.
        serif: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Escala tipográfica del instrumento: etiquetas diminutas en mono,
        // cifras grandes, sin tamaños intermedios blandos.
        micro: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.12em" }],
        label: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        // Cantos vivos: es un instrumento de medida, no una tarjeta blanda.
        none: "0px",
        sm: "1px",
        DEFAULT: "2px",
        md: "2px",
        lg: "3px",
        xl: "4px",
        "2xl": "6px",
        "3xl": "8px",
        full: "9999px",
      },
      boxShadow: {
        // Sin nubes: la profundidad se dibuja con filetes, no con desenfoque.
        sm: `0 1px 0 0 ${line}`,
        DEFAULT: `0 1px 0 0 ${line}`,
        md: `0 1px 2px 0 rgb(21 23 26 / 0.06), 0 0 0 1px ${line}`,
        lg: `0 2px 8px -2px rgb(21 23 26 / 0.10), 0 0 0 1px ${line}`,
        xl: `0 8px 28px -8px rgb(21 23 26 / 0.16), 0 0 0 1px ${line}`,
        none: "none",
      },
      letterSpacing: {
        tightest: "-0.045em",
        tighter: "-0.03em",
      },
      keyframes: {
        "facing-in": {
          "0%": { opacity: "0", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "facing-in": "facing-in 420ms cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "rise-in": "rise-in 560ms cubic-bezier(0.2, 0.7, 0.3, 1) both",
        sweep: "sweep 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
