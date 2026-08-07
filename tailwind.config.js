/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#060608',
          900: '#0A0A0E',
          800: '#131318',
          700: '#1A1A22',
          600: '#23232E',
          500: '#323242',
        },
        cream: {
          50: '#FAF8F5',
          100: '#F4F0E8',
          200: '#E8E1D3',
        },
        swiss: {
          orange: '#FF5500',
          orangeHover: '#FF6B1A',
          lime: '#CCFF00',
          cyan: '#00E5FF',
          yellow: '#FFCC00',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '18px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
      },
      boxShadow: {
        'bento': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'bento-hover': '0 12px 48px 0 rgba(0, 0, 0, 0.48)',
        'pill': '0 4px 20px rgba(0, 0, 0, 0.25)',
        'glow-orange': '0 0 24px rgba(255, 85, 0, 0.35)',
      },
    },
  },
  plugins: [],
}
