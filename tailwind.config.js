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
        'bg-base': '#1B2B22',
        'surface': '#223327',
        'surface-raised': '#2A3D30',
        'text-primary': '#E8E3D3',
        'text-secondary': '#B8B29C',
        'accent-ochre': '#C9A227',
        'accent-rust': '#8B4B33',
        'accent-trail': '#4C8C86',
        'crowd-low': '#5B8A5A',
        'crowd-medium': '#C9A227',
        'crowd-high': '#A34530',
        // Light theme overrides
        'light-bg': '#F5F0E8',
        'light-surface': '#EDE8DC',
        'light-surface-raised': '#FFFFFF',
        'light-text-primary': '#1B2B22',
        'light-text-secondary': '#4A5A4E',
      },
      fontFamily: {
        'display': ['Fraunces', 'serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'card': '10px',
      },
      transitionTimingFunction: {
        'field-atlas': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      animation: {
        'spin-slow': 'spin 60s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'trail-draw': 'trailDraw 1.5s ease-in-out forwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards',
        'slide-out': 'slideOut 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards',
        'fade-in': 'fadeIn 0.3s ease-in-out forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        trailDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
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
      },
    },
  },
  plugins: [],
}
