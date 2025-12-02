/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GPR Brand Colors
        'gpr-gold': {
          50: '#faf8f2',
          100: '#f5f0e0',
          200: '#ebdfc0',
          300: '#deca96',
          400: '#d1b46c',
          500: '#c9a54d', // Primary gold
          600: '#b08a3a',
          700: '#926c30',
          800: '#77572c',
          900: '#624828',
        },
        'gpr-navy': {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43', // Primary navy
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
