/**
 * Design Tokens — Uchqun Mobile App
 * Single source of truth, aligned to Figma design template.
 *
 * Primary palette (globals.css):
 *   Soft Navy  #2E3A59   — primary text, interactive
 *   Powder Blue #BFD7EA  — light accent
 *   Warm Sand  #F4EDE2   — page background
 *   Blush Peach #F8D7C4  — warm accent
 *   Mint Mist  #DFF4EC   — success/mint
 *   Honey Gold #E8C27E   — accent/active indicator
 */

// ── Named design palette ──────────────────────────────────────────────
export const palette = {
  softNavy: "#2E3A59",
  powderBlue: "#BFD7EA",
  warmSand: "#F4EDE2",
  blushPeach: "#F8D7C4",
  mintMist: "#DFF4EC",
  honeyGold: "#E8C27E",
};

// ── Light theme ───────────────────────────────────────────────────────
const lightColors = {
  text: {
    primary: "#2E3A59",     // Soft Navy (globals.css --color-text-primary)
    secondary: "#5A6B8C",   // (globals.css --color-text-secondary)
    muted: "#8C9BB5",       // (globals.css --color-text-tertiary)
    tertiary: "#8C9BB5",
    white: "#FFFFFF",
    inverse: "#FFFFFF",
  },
  background: {
    primary: "#F4EDE2",     // Warm Sand (globals.css --color-background)
    secondary: "#FFFFFF",   // White surface
    tertiary: "#F8F9FA",
    soft: "#F4EDE2",
    gradient: ["#BFD7EA", "#DFF4EC"],
    parentGradient: ["#BFD7EA", "#DFF4EC"],
    teacherGradient: ["#BFD7EA", "#DFF4EC"],
  },
  nav: {
    active: "#2E3A59",      // Soft Navy for active tab icon container
    inactive: "#8C9BB5",    // Tertiary text for inactive
    background: "#FFFFFF",
    indicator: "#E8C27E",   // Honey Gold dot under active tab
  },
  card: {
    base: "#FFFFFF",
    elevated: "#FFFFFF",
    light: "#F8F9FA",
    border: "rgba(191, 215, 234, 0.3)",     // --color-border
    borderLight: "rgba(191, 215, 234, 0.15)", // --color-border-soft
    glass: "rgba(255, 255, 255, 0.7)",      // --color-surface-glass
  },
  surface: {
    card: "#FFFFFF",
    secondary: "#F8F9FA",
    tertiary: "#F4EDE2",
    overlay: "rgba(46, 58, 89, 0.5)",
    glass: "rgba(255, 255, 255, 0.7)",
  },
  border: {
    light: "rgba(191, 215, 234, 0.15)",
    medium: "rgba(191, 215, 234, 0.3)",
    dark: "rgba(191, 215, 234, 0.5)",
  },
};

// ── Dark theme ────────────────────────────────────────────────────────
const darkColors = {
  text: {
    primary: "#FFFFFF",
    secondary: "#CCCCCC",
    muted: "#999999",
    tertiary: "#666666",
    white: "#FFFFFF",
    inverse: "#000000",
  },
  background: {
    primary: "#0A0F1A",
    secondary: "#141B2D",
    tertiary: "#1E2A47",
    soft: "#141B2D",
    gradient: ["#0A0F1A", "#141B2D"],
    parentGradient: ["#0A0F1A", "#141B2D"],
    teacherGradient: ["#0A0F1A", "#141B2D"],
  },
  nav: {
    active: "#FFFFFF",
    inactive: "#666666",
    background: "#141B2D",
    indicator: "#E8C27E",
  },
  card: {
    base: "#141B2D",
    elevated: "#1E2A47",
    light: "#2E3A59",
    border: "rgba(191, 215, 234, 0.15)",
    borderLight: "rgba(191, 215, 234, 0.08)",
    glass: "rgba(20, 27, 45, 0.7)",
  },
  surface: {
    card: "#141B2D",
    secondary: "#1E2A47",
    tertiary: "#2E3A59",
    overlay: "rgba(0, 0, 0, 0.8)",
    glass: "rgba(20, 27, 45, 0.7)",
  },
  border: {
    light: "rgba(191, 215, 234, 0.08)",
    medium: "rgba(191, 215, 234, 0.15)",
    dark: "rgba(191, 215, 234, 0.25)",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────
export function getThemeColors(isDark = false) {
  return isDark ? darkColors : lightColors;
}

export function getTokens(isDark = false) {
  const colors = isDark ? darkColors : lightColors;

  return {
    colors: {
      ...colors,

      // Named palette (for direct reference)
      palette,

      accent: {
        blue: "#2E3A59",        // Soft Navy (primary interactive)
        blueSoft: "#E8F4F8",
        blueVibrant: "#2E3A59",
        gold: "#E8C27E",        // Honey Gold (accent/indicator)
        goldSoft: "#FAF3E7",
        purple: "#A78BFA",
        purpleSoft: "#EDE9FE",
        // Indexed aliases
        50: "#F8F9FA",
        100: "#E8F4F8",
        200: "#BFD7EA",
        500: "#2E3A59",
        600: "#1E2A47",
        700: "#0E1A35",
      },

      semantic: {
        success: "#34D399",
        successSoft: "#DFF4EC",
        warning: "#F59E0B",
        warningSoft: "#FEF3C7",
        error: "#EF4444",
        errorSoft: "#FEE2E2",
        info: "#4A90E2",
        infoSoft: "#E8F4F8",
      },

      joy: {
        coral: "#F472B6",
        coralSoft: "#FCE7F3",
        mint: "#DFF4EC",
        mintSoft: "#F0FAF7",
        sunflower: "#E8C27E",
        sunflowerSoft: "#FAF3E7",
        lavender: "#A78BFA",
        lavenderSoft: "#EDE9FE",
        sky: "#BFD7EA",
        skySoft: "#E8F4F8",
        peach: "#F8D7C4",
        peachSoft: "#FDF0EA",
        rose: "#F472B6",
        roseSoft: "#FCE7F3",
        emerald: "#34D399",
        emeraldSoft: "#DFF4EC",
      },

      gradients: {
        primary: ["#BFD7EA", "#DFF4EC"],
        welcome: ["rgba(191,215,234,0.3)", "rgba(223,244,236,0.3)"],
        success: ["#DFF4EC", "#34D399"],
        sunset: ["#F8D7C4", "#E8C27E"],
        ocean: ["#BFD7EA", "#2E3A59"],
        aurora: ["#A78BFA", "#F472B6"],
        golden: ["#E8C27E", "#F8D7C4"],
        forest: ["#DFF4EC", "#BFD7EA"],
        candy: ["#F472B6", "#A78BFA"],
        nutrition: ["rgba(232,194,126,0.3)", "rgba(248,215,196,0.3)"],
        hydration: ["#BFD7EA", "#DFF4EC"],
        activityProgress: ["#DFF4EC", "#E8C27E"],
      },

      ui: {
        shadow: "#2E3A59",
        overlay: "rgba(46, 58, 89, 0.02)",
        overlayDark: "rgba(0, 0, 0, 0.5)",
      },

      // Indexed scales for backward compatibility
      primary: {
        50: "#F4EDE2",
        100: "#E8F4F8",
        200: "#BFD7EA",
        300: "#9AC2DD",
        400: "#6FADD0",
        500: "#2E3A59",
        600: "#1E2A47",
        700: "#0E1A35",
        800: "#0A1228",
        900: "#060D1C",
      },
      neutral: {
        50: "#F8F9FA",
        100: "#F4EDE2",
        200: "#E9ECEF",
        300: "#DEE2E6",
        400: "#8C9BB5",
        500: "#5A6B8C",
        600: "#2E3A59",
        700: "#1E2A47",
        800: "#0E1A35",
        900: "#060D1C",
      },
    },

    // ── Glass effect ────────────────────────────────────────────────
    glass: {
      bg: "rgba(255, 255, 255, 0.7)",
      border: "rgba(255, 255, 255, 0.3)",
      blur: 12,
    },

    // ── Spacing (px) ────────────────────────────────────────────────
    space: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,    // Figma uses px-5 = 20px for page padding
      "2xl": 24,
      "3xl": 32,
      "4xl": 48,
      "5xl": 64,
      // Numeric aliases
      1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48,
    },

    // ── Border radius (px) — from globals.css ───────────────────────
    radius: {
      sm: 8,     // --radius-sm
      md: 12,    // --radius-md
      lg: 16,    // --radius-lg
      xl: 20,    // --radius-xl
      "2xl": 24,
      pill: 999,
      full: 999,
    },

    // ── Typography ──────────────────────────────────────────────────
    typography: {
      fontSize: {
        xs: 11,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        "2xl": 24,
        "3xl": 28,
        "4xl": 36,
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
      },
    },

    // ── Type presets — from globals.css h1/h2/h3 ────────────────────
    type: {
      hero: { fontSize: 28, fontWeight: "700", lineHeight: 34, letterSpacing: -0.5 },
      h1:   { fontSize: 28, fontWeight: "700", lineHeight: 34, letterSpacing: -0.5 },
      h2:   { fontSize: 24, fontWeight: "600", lineHeight: 30, letterSpacing: -0.3 },
      h3:   { fontSize: 20, fontWeight: "600", lineHeight: 26 },
      body:     { fontSize: 14, fontWeight: "400", lineHeight: 22 },
      bodyLarge: { fontSize: 16, fontWeight: "500", lineHeight: 24 },
      sub:      { fontSize: 12, fontWeight: "500", lineHeight: 16 },
      caption:  { fontSize: 11, fontWeight: "600", lineHeight: 14 },
      button:   { fontSize: 14, fontWeight: "600", lineHeight: 18 },
    },

    // ── Shadows — from globals.css, navy-tinted ─────────────────────
    shadow: {
      none: {
        shadowColor: "transparent",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      },
      xs: {
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
      },
      soft: {                              // --shadow-soft
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      },
      sm: {                                // alias for soft
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      },
      card: {                              // --shadow-medium
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
      },
      elevated: {                          // --shadow-strong
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 6,
      },
      float: {                             // --shadow-float
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 48,
        elevation: 8,
      },
      glass: {                             // --glass-shadow
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 32,
        elevation: 5,
      },
      glow: {
        shadowColor: "#E8C27E",            // Honey Gold glow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 3,
      },
      glowSuccess: {
        shadowColor: "#34D399",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
      },
    },

    // ── Animation ───────────────────────────────────────────────────
    animation: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 400,                          // --transition-slow
      verySlow: 700,
      spring: { damping: 18, stiffness: 180 },
      springGentle: { damping: 25, stiffness: 120 },
      easing: {
        easeInOut: [0.4, 0, 0.2, 1],     // --transition-default
        easeOut: [0, 0, 0.2, 1],
        easeIn: [0.4, 0, 1, 1],
        sharp: [0.4, 0, 0.6, 1],
      },
      float: { duration: 6000 },
      pulseSoft: { duration: 3000 },
    },

    // ── Backward-compat getters ─────────────────────────────────────
    get shadows() { return this.shadow; },
    get spacing() { return this.space; },

    // ── Touch targets — from globals.css ─────────────────────────────
    touchTarget: {
      min: 48,                            // --touch-target-min
      comfortable: 56,                    // --touch-target-comfortable
    },

    // ── Icon sizes ──────────────────────────────────────────────────
    icon: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 28,
      xl: 32,
      "2xl": 48,
      stroke: 1.5,                        // --icon-stroke
    },
  };
}

// ── Default export (light theme) ────────────────────────────────────
export const tokens = getTokens(false);
export default tokens;
