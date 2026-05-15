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
      },
    },
  },
  plugins: [],
};
