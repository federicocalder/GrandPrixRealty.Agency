/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'grand-dark': '#0a0a0a',
        'grand-darker': '#050505',
        'grand-charcoal': '#1a1a1a',
        'grand-steel': '#2a2a2a',
        'grand-silver': '#e5e5e5',
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'display': ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
