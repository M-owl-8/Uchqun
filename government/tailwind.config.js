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
        // ── Legacy brand tokens (DO NOT REMOVE) ───────────────────────────
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
        // ── DNP design system tokens (GOV-REDESIGN-01) ────────────────────
        // Top-level tokens match spec appendix class names exactly:
        // bg-green, text-ink, border-field-border, bg-panel-top, etc.
        green: {
          DEFAULT: '#4F7B4E',
          hover:   '#426B41',
          press:   '#385B37',
        },
        panel: {
          top:     '#2E5A36',
          bottom:  '#1B3A22',
          ink:     '#EAF1E7',
          dim:     '#A9C3A6',
        },
        bg:     '#F4F1EA',
        card:   '#FFFFFF',
        ink:    '#1C2A1E',
        muted:  '#6A7A6B',
        faint:  '#93A293',
        border: '#E2E0D6',
        field: {
          bg:     '#FAFAF7',
          border: '#D9D7CC',
        },
        danger:  '#B5462F',
        warning: '#B57A1E',
        info:    '#2F6B7A',
        // dnp.* alias namespace kept for backwards-compat with GOV-REDESIGN-01 components
        dnp: {
          green:        '#4F7B4E',
          'green-hover': '#426B41',
          'green-press': '#385B37',
          'panel-top':  '#2E5A36',
          'panel-bottom': '#1B3A22',
          'panel-ink':  '#EAF1E7',
          'panel-ink-dim': '#A9C3A6',
          bg:           '#F4F1EA',
          card:         '#FFFFFF',
          ink:          '#1C2A1E',
          muted:        '#6A7A6B',
          faint:        '#93A293',
          border:       '#E2E0D6',
          'field-bg':   '#FAFAF7',
          'field-border': '#D9D7CC',
          danger:       '#B5462F',
          warning:      '#B57A1E',
          info:         '#2F6B7A',
        },
      },
      borderRadius: {
        // spec appendix names: rounded-input, rounded-btn, rounded-card, rounded-sheet
        input:  '11px',
        btn:    '12px',
        card:   '14px',
        sheet:  '22px',
        // dnp-* aliases kept for compat
        'dnp-input':  '11px',
        'dnp-btn':    '12px',
        'dnp-card':   '14px',
        'dnp-sheet':  '22px',
      },
      boxShadow: {
        // spec appendix names: shadow-focus, shadow-err, shadow-card, shadow-sm
        focus:    '0 0 0 4px rgba(79,123,78,.13)',
        err:      '0 0 0 4px rgba(181,70,47,.10)',
        card:     '0 1px 2px rgba(28,42,30,.04), 0 24px 50px -28px rgba(28,42,30,.30)',
        sm:       '0 1px 2px rgba(28,42,30,.04)',
        // dnp-* aliases kept for compat
        'dnp-focus': '0 0 0 4px rgba(79,123,78,.13)',
        'dnp-err':   '0 0 0 4px rgba(181,70,47,.10)',
        'dnp-card':  '0 1px 2px rgba(28,42,30,.04), 0 24px 50px -28px rgba(28,42,30,.30)',
        'dnp-sm':    '0 1px 2px rgba(28,42,30,.04)',
      },
      height: {
        'dnp-input': '50px',
        'dnp-btn':   '52px',
      },
      fontFamily: {
        // spec appendix: font-sans, font-mono
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        // named aliases kept
        inter: ['Inter', 'system-ui', 'sans-serif'],
        'geist-mono': ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
