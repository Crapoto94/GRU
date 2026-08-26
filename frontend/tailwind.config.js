/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ville: {
          primary: "#0055A4",
          secondary: "#E1000F",
          light: "#F0F4F8",
          dark: "#1A2332",
        },
      },
    },
  },
  plugins: [],
};
