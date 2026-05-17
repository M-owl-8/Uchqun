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
        // Surface foundations
        paper: '#FAFAF8',
        surface: '#FFFFFE',

        // Brand: muted lavender (10-stop scale, 600 = primary)
        brand: {
          50:  '#F6F3FB',
          100: '#ECE6F4',
          200: '#D8CFE5',
          300: '#BFB2D3',
          400: '#A294BD',
          500: '#8B7DAF',
          600: '#7A6FA8',
          700: '#5F567F',
          800: '#46405F',
          900: '#2E2A40',
        },

        // Cool slate (overrides shared if any)
        slate: {
          50:  '#F6F7F9',
          100: '#EDEFF2',
          200: '#DDE0E6',
          300: '#C2C7D1',
          400: '#959BA8',
          500: '#6F7585',
          600: '#525868',
          700: '#3D424F',
          800: '#2A2E39',
          900: '#1E2026',
        },

        // Sidebar chrome: warm charcoal (Teacher-only)
        bark: {
          DEFAULT: '#2A2530',
          hover:   '#3A3340',
          divider: '#48404F',
          muted:   '#928A9C',
          text:    '#F4F0F5',
        },

        // Secondary accent: soft mint
        mint: {
          100: '#E2F0E8',
          300: '#A8D2BC',
          500: '#7AB89A',
          700: '#4F8C72',
        },

        // Child ribbon palette (12 stops)
        child: {
          lavender:   '#9889B8',
          mint:       '#7FB69A',
          coral:      '#D08573',
          sand:       '#C7A878',
          sky:        '#7CA6C6',
          rose:       '#C58CA5',
          olive:      '#9AA47A',
          peach:      '#D8A47F',
          cornflower: '#8593C4',
          heather:    '#A990B0',
          clay:       '#B98373',
          fern:       '#7FA88A',
        },

        // Semantic (success.* inherited from shared preset — do NOT redefine)
        warning: {
          50:  '#FBF3E4',
          200: '#F0DBA8',
          500: '#C58A1F',
          700: '#8E6314',
        },
        error: {
          50:  '#F7EBE7',
          200: '#E8C7BE',
          500: '#9A5045', // softer Bordeaux — intentionally distinct from bright red
          700: '#6F362E',
        },
        info: {
          50:  '#EEF2F7',
          200: '#C3D0DF',
          500: '#4D6584',
          700: '#37495F',
        },
      },

      borderRadius: {
        sm:  '6px',
        md:  '8px',
        lg:  '12px',
        xl:  '16px',
        '2xl': '20px',
      },

      boxShadow: {
        xs:   '0 1px 2px rgba(30,32,38,.04), 0 1px 1px rgba(30,32,38,.03)',
        sm:   '0 2px 4px rgba(30,32,38,.06), 0 1px 2px rgba(30,32,38,.04)',
        md:   '0 8px 24px rgba(30,32,38,.10), 0 2px 6px rgba(30,32,38,.05)',
        lg:   '0 20px 48px rgba(30,32,38,.16), 0 8px 16px rgba(30,32,38,.08)',
        ring: '0 0 0 2px #fff, 0 0 0 4px rgba(122,111,168,.30)',
      },

      fontSize: {
        h1:      ['28px', { lineHeight: '1.2',  fontWeight: '600' }],
        h1l:     ['30px', { lineHeight: '1.2',  fontWeight: '600' }],
        h2:      ['22px', { lineHeight: '1.3',  fontWeight: '600' }],
        h3:      ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        body:    ['15px', { lineHeight: '1.55' }],
        'body-m':['16px', { lineHeight: '1.55' }],
        small:   ['13px', { lineHeight: '1.5'  }],
        caption: ['12px', { lineHeight: '1.45' }],
        col:     ['11px', { lineHeight: '1', letterSpacing: '0.06em' }],
      },
    },
  },
  plugins: [],
};
