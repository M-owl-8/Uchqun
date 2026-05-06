/** @type {import('tailwindcss').Config} */
export const primaryColors = {
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
};

export const baseTheme = {
  extend: {
    colors: {
      primary: primaryColors,
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
};
