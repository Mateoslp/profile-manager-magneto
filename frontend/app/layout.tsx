import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIKAI — Plataforma de Empleo con IA",
  description:
    "LIKAI conecta candidatos con vacantes usando agentes de inteligencia artificial: Lexi, Inari, Kenti e Iris.",
  keywords: ["empleo", "inteligencia artificial", "vacantes", "Colombia", "LIKAI"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
