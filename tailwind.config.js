/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        brand: { blue: '#2563EB', 'blue-d': '#1D4ED8', 'blue-l': '#DBEAFE', 'blue-ll': '#EFF6FF' },
      }
    }
  },
  plugins: []
}
