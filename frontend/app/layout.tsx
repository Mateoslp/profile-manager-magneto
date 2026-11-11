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
  const themeInitScript = `
    (function() {
      try {
        var saved = localStorage.getItem('likai-theme');
        if (saved === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          if (!saved) {
            localStorage.setItem('likai-theme', 'light');
          }
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
