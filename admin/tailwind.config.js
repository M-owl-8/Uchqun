import { basePreset } from '../shared/tailwind.base.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [basePreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../shared/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — terracotta / clay (admin-only)
        brand: {
          50:  '#FBF3EE',
          100: '#F4E1D4',
          200: '#E9C4AE',
          300: '#DCA487',
          400: '#CC8364',
          500: '#BA6E4F',
          600: '#A85C40', // primary action
          700: '#8D4A33', // hover / pressed
          800: '#6E3A2A', // headings, seal
          900: '#4A2820',
        },
        // Page surfaces
        cream:   '#FAF7F2',
        surface: '#FFFCF8',
        // Warm-neutrals (beige-leaning, never blue)
        warm: {
          50:  '#F7F3EC',
          100: '#EFE9DE',
          200: '#DFD6C6',
          300: '#C9BCA9',
          400: '#9E907C',
          500: '#756959',
          600: '#574F43',
          700: '#3E382F',
          800: '#2D2823',
          900: '#1E1A16',
        },
        // Sidebar chrome — walnut
        walnut: {
          DEFAULT: '#3D2F2B',
          hover:   '#4E3D38',
          divider: '#52423D',
          muted:   '#9F8C84',
          text:    '#F2E9DF',
        },
        // success.* (olive) inherited from shared preset — do NOT redefine
        warning: { 50: '#F8EFD7', 100: '#F1DFAF', 500: '#C99732', 600: '#B4811F', 700: '#8D6418' },
        error:   { 50: '#F4DEDB', 100: '#EAC4BF', 500: '#B1554F', 600: '#9A3E3A', 700: '#7B302D' },
        info:    { 50: '#E1E7EE', 100: '#C5D0DC', 500: '#5F7892', 600: '#4D6584', 700: '#3D506C' },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(45,40,35,0.04), 0 1px 1px rgba(45,40,35,0.03)',
        sm: '0 2px 4px rgba(45,40,35,0.06), 0 1px 2px rgba(45,40,35,0.04)',
        md: '0 6px 16px rgba(45,40,35,0.08), 0 2px 4px rgba(45,40,35,0.04)',
        lg: '0 16px 40px rgba(45,40,35,0.14), 0 6px 12px rgba(45,40,35,0.06)',
      },
    },
  },
  plugins: [],
};
