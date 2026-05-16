import { basePreset } from '../shared/tailwind.base.js';

const brandColors = {
  50:  '#F2F6F1',
  100: '#E3ECE2',
  200: '#C7D9C5',
  300: '#A4C0A1',
  400: '#7FA67D',
  500: '#6B9869',
  600: '#5B8C5A',
  700: '#487049',
  800: '#385838',
  900: '#2A4129',
};

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
        primary: brandColors,
        brand: brandColors,
        sidebar: {
          DEFAULT: '#1C2620',
          hover:   '#293530',
          active:  '#3A4A40',
          text:    '#FFFFFF',
          muted:   '#8B978E',
          line:    '#2D3B33',
        },
        paper: {
          DEFAULT: '#F7F5EF',
          card:    '#FDFCF8',
          deep:    '#EFEDE6',
        },
        inkGreen: {
          800: '#233227',
          900: '#15201A',
        },
      },
    },
  },
  plugins: [],
};
