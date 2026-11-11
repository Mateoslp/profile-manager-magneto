/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta adaptable: Modo Claro por defecto (:root) y Modo Oscuro (html.dark)
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          card: "rgb(var(--color-surface-card) / <alpha-value>)",
          elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
          border: "rgb(var(--color-surface-border) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          light: "rgb(var(--color-accent-light) / <alpha-value>)",
          dark: "rgb(var(--color-accent-dark) / <alpha-value>)",
          glow: "var(--accent-glow)",
        },
        text: {
          primary: "rgb(var(--color-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        },
        status: {
          success: "rgb(var(--color-status-success) / <alpha-value>)",
          warning: "rgb(var(--color-status-warning) / <alpha-value>)",
          error: "rgb(var(--color-status-error) / <alpha-value>)",
          info: "rgb(var(--color-status-info) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "0 0 24px var(--accent-glow)",
        "glow-sm": "0 0 12px var(--accent-glow)",
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
