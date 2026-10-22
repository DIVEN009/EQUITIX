/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "rgb(var(--brand-bg) / <alpha-value>)",
          surface: "rgb(var(--brand-surface) / <alpha-value>)",
          card: "rgb(var(--brand-card) / <alpha-value>)",
          cardHover: "rgb(var(--brand-card-hover) / <alpha-value>)",
          border: "var(--brand-border)",
          borderHover: "var(--brand-border-hover)",
          emerald: "rgb(var(--brand-emerald) / <alpha-value>)",
          emeraldDark: "rgb(var(--brand-emerald-dark) / <alpha-value>)",
          cyan: "rgb(var(--brand-cyan) / <alpha-value>)",
          red: "rgb(var(--brand-red) / <alpha-value>)",
          textPrimary: "rgb(var(--brand-text-primary) / <alpha-value>)",
          textSecondary: "rgb(var(--brand-text-secondary) / <alpha-value>)",
          textMuted: "rgb(var(--brand-text-muted) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        emeraldGlow: "var(--shadow-emerald-glow)",
        cardGlass: "var(--shadow-card-glass)",
        xl: "0 20px 40px rgba(0,0,0,0.08)",
        "2xl": "0 25px 50px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
