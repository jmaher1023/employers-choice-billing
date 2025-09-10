/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The Employers Choice Brand Colors
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#9D0035', // Main brand color
          600: '#8b002f',
          700: '#790029',
          800: '#670023',
          900: '#55001d',
        },
        brand: {
          red: '#9D0035',
          'red-light': '#9d003529',
          gray: '#f6f8fa',
          'gray-light': '#f9fafb',
          'gray-border': '#e6e6e6',
          'text-dark': '#222',
          'text-medium': '#444',
          'text-light': '#888',
        }
      },
      fontFamily: {
        'brand': ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
