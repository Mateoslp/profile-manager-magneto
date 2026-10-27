/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal: oscuro + acento violeta-azul
        surface: {
          DEFAULT: "#0f0f1a",
          card: "#16162a",
          elevated: "#1e1e35",
          border: "#2d2d50",
        },
        accent: {
          DEFAULT: "#7c6af7",
          light: "#a89cf9",
          dark: "#5a48d4",
          glow: "rgba(124, 106, 247, 0.25)",
        },
        text: {
          primary: "#e8e8f0",
          secondary: "#9090b0",
          muted: "#5a5a7a",
        },
        status: {
          success: "#34d399",
          warning: "#fbbf24",
          error: "#f87171",
          info: "#60a5fa",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.4)",
        glow: "0 0 24px rgba(124, 106, 247, 0.3)",
        "glow-sm": "0 0 12px rgba(124, 106, 247, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        thinking: "thinking 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        thinking: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
