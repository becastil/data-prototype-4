import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0f172a",
          900: "#1e293b",
          800: "#334155",
          700: "#475569",
          600: "#64748b"
        },
        surface: {
          dark: "#1e293b",
          light: "#ffffff"
        },
        text: {
          dark: "#f8fafc",
          light: "#0f172a"
        },
        accent: {
          primary: "#10b981",
          info: "#0ea5e9",
          warning: "#f59e0b",
          danger: "#f43f5e"
        },
        status: {
          green: "#22c55e",
          yellow: "#eab308",
          red: "#ef4444"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif"
        ]
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "30px",
        "3xl": "36px"
      },
      borderRadius: {
        card: "8px",
        drawer: "12px",
        pill: "9999px"
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        card: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        strong: "0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
      },
      transitionDuration: {
        tap: "120ms",
        nav: "220ms",
        page: "400ms"
      },
      transitionTimingFunction: {
        uber: "cubic-bezier(0.2, 0.8, 0.2, 1)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" }
        },
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        }
      },
      animation: {
        shimmer: "shimmer 2s infinite linear",
        slideIn: "slideIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1)"
      }
    }
  },
  plugins: []
};

export default config;
