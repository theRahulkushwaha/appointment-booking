/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        card: "var(--bg-card)",
        hover: "var(--bg-hover)",
        border: "var(--border)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        accent: "var(--accent)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        muted: "var(--bg-hover)",
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        heading: ["'Syne'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 12px var(--accent-glow)",
        "glow-lg": "0 0 20px var(--accent-glow)",
      },
    },
  },
  plugins: [],
};
