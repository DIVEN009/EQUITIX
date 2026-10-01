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
          bg: "#0A0E17",
          surface: "#111622",
          card: "#161D2B",
          cardHover: "#1C2536",
          border: "rgba(255, 255, 255, 0.08)",
          borderHover: "rgba(0, 245, 155, 0.3)",
          emerald: "#00F59B",
          emeraldDark: "#059669",
          cyan: "#0EA5E9",
          red: "#EF4444",
          textPrimary: "#F8FAFC",
          textSecondary: "#94A3B8",
          textMuted: "#64748B",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        emeraldGlow: "0 0 20px rgba(0, 245, 155, 0.25)",
        cardGlass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};
