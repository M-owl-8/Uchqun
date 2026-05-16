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
        paper: '#FBFAF6',
        surface: '#FFFEFB',
        brand: {
          50:  '#FBF3DE',
          100: '#F6E6BD',
          200: '#EFD58C',
          300: '#E6C25B',
          400: '#DCAD3F',
          500: '#D29A33',
          600: '#C89030',
          700: '#A6731F',
          800: '#7E5614',
          900: '#5A3D0E',
        },
        slate: {
          50:  '#F6F5F1',
          100: '#ECEAE3',
          200: '#DAD7CC',
          300: '#BDB9AC',
          400: '#8E8B81',
          500: '#6A6862',
          600: '#4D4C47',
          700: '#363632',
          800: '#272826',
          900: '#1F2528',
        },
        teak: {
          DEFAULT: '#2A3B3D',
          hover:   '#384B4D',
          divider: '#445759',
          muted:   '#8FA2A4',
          text:    '#F4F1EA',
        },
        accent: {
          100: '#DDE9E8',
          300: '#9EBCBA',
          500: '#5A8A87',
          700: '#3D625F',
        },
        // success.* inherited from shared preset — do NOT redefine
        warning: {
          50:  '#FBF1D8',
          100: '#F4DEA0',
          500: '#D7A02A',
          600: '#C58A1F',
          700: '#9B6C16',
        },
        error: {
          50:  '#F6E2E0',
          100: '#ECC4C0',
          500: '#B14842',
          600: '#9A3E3A',
          700: '#762E2B',
        },
        info: {
          50:  '#E4E9F1',
          100: '#C6D0E0',
          500: '#5C7596',
          600: '#4D6584',
          700: '#3B4E68',
        },
      },
      boxShadow: {
        xs: '0 1px 2px rgba(31, 37, 40, 0.04), 0 1px 1px rgba(31, 37, 40, 0.03)',
        sm: '0 2px 4px rgba(31, 37, 40, 0.06), 0 1px 2px rgba(31, 37, 40, 0.04)',
        md: '0 8px 24px rgba(31, 37, 40, 0.10), 0 2px 6px rgba(31, 37, 40, 0.05)',
        lg: '0 20px 48px rgba(31, 37, 40, 0.16), 0 8px 16px rgba(31, 37, 40, 0.08)',
        xl: '0 32px 64px rgba(31, 37, 40, 0.22)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
