import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Taken from the GVBL logo ribbon
        violet: {
          50: "#F7F3FB",
          100: "#EEE5F7",
          200: "#DCCBEE",
          300: "#C2A5E0",
          400: "#A57BCF",
          500: "#8A56C2",
          600: "#7140A8",
          700: "#5B2A86",
          800: "#46216A",
          900: "#2E1647",
        },
        // Blue accent for secondary actions and "completed" state
        lab: {
          50: "#EFF3FC",
          100: "#DCE5F8",
          500: "#3F5BC4",
          600: "#3249A8",
          700: "#283B88",
        },
        ink: {
          DEFAULT: "#231C2E",
          soft: "#4A4458",
          muted: "#6F6A7C",
          faint: "#9A95A6",
        },
        rule: "#E4DDEC",
        mist: "#F8F6FB",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(46, 22, 71, 0.06)",
        pop: "0 12px 32px -8px rgba(46, 22, 71, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
