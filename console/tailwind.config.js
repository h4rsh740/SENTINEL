/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(224, 71%, 4%)",
        card: "hsl(222, 47%, 7%)",
        border: "hsl(217, 33%, 17%)",
        accent: "hsl(217, 91%, 60%)",
        sentinel: {
          blue: "#38bdf8",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
          dark: "#0b0f19",
          slate: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
