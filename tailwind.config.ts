import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pixel warm palette
        cream: {
          50: "#fffdf5",
          100: "#fff9e8",
          200: "#f7edc8",
          300: "#f5e8c8",
          400: "#e8dcc8",
          500: "#d7c49d",
          600: "#cbb78f",
          700: "#a49474",
          800: "#6c5a3c",
          900: "#3b2a19",
          950: "#2a1a0a",
        },
        pixel: {
          orange: "#c96f2d",
          brown: "#6c5a3c",
          gold: "#fff3b0",
          darkGold: "#d3b34b",
          green: "#96cf8a",
          blue: "#4da3c7",
          pink: "#efb38a",
          red: "#cf3e31",
          purple: "#a08cb8",
        },
        item: {
          food: "#ff8d6a",
          coin: "#ffe681",
          shield: "#dff3d8",
          boost: "#bfeaff",
        },
      },
      fontFamily: {
        pixel: ["var(--font-pixel)"],
      },
      boxShadow: {
        pixel: "3px 3px 0 #cbb78f",
        "pixel-lg": "0 6px 0 rgba(203,183,143,1)",
        "pixel-card": "0 14px 28px rgba(77,55,21,0.12)",
        "pixel-panel": "3px 3px 0 #cbb78f",
        "pixel-btn": "0 4px 0 #c48d43",
        "pixel-btn-blue": "0 4px 0 #4b93ab",
      },
      borderRadius: {
        pixel: "20px",
        "pixel-sm": "14px",
        "pixel-xs": "10px",
      },
      backgroundImage: {
        "gradient-cream": "linear-gradient(180deg, #fff8de, #f7edc8)",
        "gradient-card": "linear-gradient(180deg, rgba(255,247,226,0.92), rgba(248,242,220,0.9))",
        "grid-overlay": `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23cbb78f' fill-opacity='0.15'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },
      animation: {
        "ping-slow": "ping 1.6s ease-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
