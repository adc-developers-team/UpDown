/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adc: {
          dark: '#1e1b3a',
          indigo: '#8b5cf6',
          muted: '#9ca3af',
          white: '#ffffff',
        }
      },
      fontFamily: {
        brand: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
