import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Display: señalética de tienda. Se usa en titulares y cifras grandes.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

// Texto corrido.
const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Dato: EAN, posiciones, importes, etiquetas de eje. Cifras tabulares.
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cartistry — El lineal, medido",
  description:
    "Cruza tus ventas con 26 reglas de visual merchandising y coloca cada producto donde vende.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} font-sans bg-paper text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
