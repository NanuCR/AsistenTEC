import { nextui } from "@nextui-org/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["SF Mono", "Menlo", "Monaco", "Courier New", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary:    { DEFAULT: "#007AFF", foreground: "#FFFFFF" },
            secondary:  { DEFAULT: "#5856D6", foreground: "#FFFFFF" },
            success:    { DEFAULT: "#34C759", foreground: "#FFFFFF" },
            warning:    { DEFAULT: "#FF9500", foreground: "#FFFFFF" },
            danger:     { DEFAULT: "#FF3B30", foreground: "#FFFFFF" },
          },
        },
        dark: {
          colors: {
            primary:    { DEFAULT: "#0A84FF", foreground: "#FFFFFF" },
            secondary:  { DEFAULT: "#5E5CE6", foreground: "#FFFFFF" },
            success:    { DEFAULT: "#32D74B", foreground: "#FFFFFF" },
            warning:    { DEFAULT: "#FF9F0A", foreground: "#FFFFFF" },
            danger:     { DEFAULT: "#FF453A", foreground: "#FFFFFF" },
          },
        },
      },
    }),
  ],
};
