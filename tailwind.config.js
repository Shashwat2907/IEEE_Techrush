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
        'bg-base': '#080C14',
        'surface': '#0F172A',
        'surface-raised': '#1E293B',
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
        'text-muted': '#64748B',
        'accent-sky': '#38BDF8',
        'accent-amber': '#F59E0B',
        'accent-emerald': '#10B981',
        'accent-rose': '#F43F5E',
        'accent-indigo': '#6366F1',
        'crowd-low': '#10B981',
        'crowd-medium': '#F59E0B',
        'crowd-high': '#EF4444',
      },
      fontFamily: {
        'display': ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        'body': ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-in-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
