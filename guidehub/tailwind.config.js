/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fcf1ea',
          100: '#f7e2d4',
          200: '#efc4a8',
          300: '#e29e71',
          400: '#cf7446',
          500: '#b85c38',
          600: '#9d4c2c',
          700: '#803a22',
          800: '#65301d',
          900: '#51281b',
          950: '#2f150d',
        },
        neutral: {
          50: '#f8f3ed',
          100: '#eee6da',
          200: '#ddd1c2',
          300: '#c7b7a3',
          400: '#9e8f81',
          500: '#786c62',
          600: '#5f544d',
          700: '#453d38',
          800: '#2d2824',
          900: '#171310',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Trebuchet MS', 'Tahoma', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        meta: ['Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
