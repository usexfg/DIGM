/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Space Grotesk', 'Inter', 'sans-serif'],
        'tech': ['Orbitron', 'Space Grotesk', 'sans-serif'],
        'futura': ['Rajdhani', 'Inter', 'sans-serif'],
        'cyber': ['Chakra Petch', 'Space Grotesk', 'sans-serif'],
        'clean': ['DM Sans', 'Inter', 'sans-serif'],
        'modern': ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        slate: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        }
      }
    },
  },
  plugins: [],
} 