/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../shared/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Teacher role: slate-900 sidebar, teal accent
        teacher: {
          sidebar: '#0F172A',
          hover: '#1E293B',
          accent: '#14B8A6',
          'accent-dim': '#0D9488',
          muted: '#64748B',
          surface: '#F8FAFC',
          border: '#E2E8F0',
        },
        // Parent role: indigo-950 sidebar, violet accent
        parent: {
          sidebar: '#1E1B4B',
          hover: '#312E81',
          accent: '#7C3AED',
          'accent-dim': '#6D28D9',
          muted: '#818CF8',
          surface: '#FAF9FF',
          border: '#EDE9FE',
        },
        // Legacy — still referenced by shared/BottomNav, LanguageSwitcher
        sidebar: {
          navy: '#2E3A59',
          muted: '#8F9BB3',
          blue: '#E8F4FD',
          mint: '#E5F7F0',
          peach: '#FFF0E5',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
