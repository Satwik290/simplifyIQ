/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1E3A8A',      // Trust Blue
          blueLight: '#3B82F6', // Lighter sky blue for focus borders
          green: '#10B981',     // Growth Green
          gold: '#F59E0B',      // Opportunity Gold
          darkBg: '#090D16',    // Sleek premium deep space background
          darkCard: '#111827',  // Clean secondary gray card surface
          darkInput: '#1F2937'  // Form fields background
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
