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
        'bg-base': '#070B14',
        'surface': '#0F1629',
        'surface-raised': '#1A2340',
        'text-primary': '#F1F5F9',
        'text-secondary': '#64748B',
        'accent-sky': '#38BDF8',
        'accent-amber': '#F59E0B',
        'accent-emerald': '#10B981',
        'accent-rose': '#F43F5E',
        'accent-indigo': '#6366F1',
        'crowd-low': '#10B981',
        'crowd-medium': '#F59E0B',
        'crowd-high': '#EF4444',
        'light-bg': '#F8FAFC',
        'light-surface': '#F1F5F9',
        'light-surface-raised': '#FFFFFF',
        'light-text-primary': '#0F172A',
        'light-text-secondary': '#475569',
      },
      fontFamily: {
        'display': ['Fraunces', 'serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      animation: {
        'spin-slow': 'spin 60s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards',
        'slide-out': 'slideOut 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards',
        'fade-in': 'fadeIn 0.3s ease-in-out forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}
