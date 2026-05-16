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

export const successColors = {
  50:  '#F4F6E8',
  100: '#E6EAC9',
  200: '#CFD89B',
  300: '#B5C46D',
  400: '#9CAE4F',
  500: '#7C8F3E',
  600: '#587538',
  700: '#465E2E',
  800: '#374A26',
  900: '#2A381E',
};

export const basePreset = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: primaryColors,
        success: successColors,
        sidebar: {
          navy: '#2E3A59',
          muted: '#8F9BB3',
          blue: '#E8F4FD',
          mint: '#E5F7F0',
          peach: '#FFF0E5',
        },
      },
      borderRadius: {
        card: '0.75rem',
        button: '0.5rem',
        badge: '9999px',
        modal: '1rem',
      },
      zIndex: {
        below: '-1',
        dropdown: '10',
        sticky: '20',
        overlay: '30',
        modal: '40',
        toast: '50',
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

// Convenience alias kept for any future direct consumers
export const baseTheme = basePreset.theme;
