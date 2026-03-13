/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        navy:   "#132F45",
        teal:   "#32667F",
        amber:  "#EEA23A",
        gold:   "#F3B940",
        orange: "#EA8B33",
      },
      fontFamily: {
        sans: ["-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};