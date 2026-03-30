/**
 * Design Tokens - Teacher Dashboard
 * Elegant, Modern, Accessible Design System
 * Based on Figma design with glassmorphism
 */

// Light theme colors - New Design Palette
const lightColors = {
  text: {
    primary: "#1E2A47", // Deeper navy for better contrast
    secondary: "#4A5A7A", // More visible secondary text
    muted: "#6B7A99", // Less faded, more readable
    tertiary: "#6B7A99",
    white: "#FFFFFF",
    inverse: "#FFFFFF",
  },

  background: {
    primary: "#F5F1E8", // Cleaner Warm Sand - slightly richer
    secondary: "#FFFFFF", // White surface
    tertiary: "#F8F9FA",
    soft: "#F5F1E8",
    gradient: ["#BFD7EA", "#DFF4EC"], // Powder Blue to Mint
    parentGradient: ["#BFD7EA", "#DFF4EC"],
    teacherGradient: ["#BFD7EA", "#DFF4EC"],
  },

  nav: {
    active: "#4A90E2", // More vibrant blue - less faded
    inactive: "#6B7A99", // Darker, more visible
    background: "#FFFFFF",
  },

  card: {
    base: "#FFFFFF",
    elevated: "#FFFFFF",
    light: "#F8F9FA",
    border: "rgba(191, 215, 234, 0.3)",
    borderLight: "rgba(191, 215, 234, 0.15)",
    glass: "rgba(255, 255, 255, 0.7)", // Glassmorphism
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

// Dark theme colors
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
    primary: "#000000",
    secondary: "#1A1A1A",
    tertiary: "#333333",
    soft: "#4D4D4D",
    gradient: ["#000000", "#1A1A1A", "#333333"],
    parentGradient: ["#000000", "#1A1A1A", "#333333"],
    teacherGradient: ["#000000", "#1A1A1A", "#333333"],
  },

  nav: {
    active: "#FFFFFF",
    inactive: "#999999",
    background: "#1A1A1A",
  },

  card: {
    base: "#1A1A1A",
    elevated: "#333333",
    light: "#4D4D4D",
    border: "#666666",
    borderLight: "#4D4D4D",
  },

  surface: {
    card: "#1A1A1A",
    secondary: "#1A1A1A",
    tertiary: "#333333",
    overlay: "rgba(0, 0, 0, 0.8)",
  },

  border: {
    light: "#333333",
    medium: "#4D4D4D",
    dark: "#666666",
  },
};

// Function to get theme colors
export function getThemeColors(isDark = false) {
  return isDark ? darkColors : lightColors;
}

// Get complete tokens for a theme
export function getTokens(isDark = false) {
  const colors = isDark ? darkColors : lightColors;

  return {
    colors: {
      ...colors,

      accent: {
        blue: "#4A90E2", // More vibrant blue for active states
        blueSoft: "#E8F4F8",
        blueVibrant: "#2E3A59", // Soft Navy
        purple: "#A78BFA", // Lavender
        purpleSoft: "#EDE9FE",
        50: "#F8F9FA",
        100: "#E8F4F8",
        200: "#BFD7EA",
        500: "#2E3A59",
        600: "#1E2A47",
        700: "#0E1A35",
      },

      semantic: {
        success: "#34D399", // Green
        successSoft: "#DFF4EC", // Mint Mist
        warning: "#F59E0B", // Orange
        warningSoft: "#FEF3C7",
        error: "#EF4444", // Red
        errorSoft: "#FEE2E2",
        info: "#A78BFA", // Purple
        infoSoft: "#EDE9FE",
      },

      joy: {
        coral: "#F472B6", // Pink
        coralSoft: "#FCE7F3",
        mint: "#DFF4EC", // Mint Mist
        mintSoft: "#F0FAF7",
        sunflower: "#E8C27E", // Honey Gold
        sunflowerSoft: "#FAF3E7",
        lavender: "#A78BFA", // Purple
        lavenderSoft: "#EDE9FE",
        sky: "#BFD7EA", // Powder Blue
        skySoft: "#E8F4F8",
        peach: "#F8D7C4", // Blush Peach
        peachSoft: "#FDF0EA",
        rose: "#F472B6",
        roseSoft: "#FCE7F3",
        emerald: "#34D399",
        emeraldSoft: "#DFF4EC",
      },

      gradients: {
        primary: ["#BFD7EA", "#DFF4EC"], // Powder Blue to Mint
        success: ["#DFF4EC", "#34D399"],
        sunset: ["#F8D7C4", "#E8C27E"], // Peach to Gold
        ocean: ["#BFD7EA", "#2E3A59"], // Blue to Navy
        aurora: ["#A78BFA", "#F472B6"], // Purple to Pink
        golden: ["#E8C27E", "#F8D7C4"], // Gold to Peach
        forest: ["#DFF4EC", "#BFD7EA"],
        candy: ["#F472B6", "#A78BFA"],
      },

      ui: {
        shadow: "#000000",
        shadowBlue: "#000000",
        overlay: "rgba(0, 0, 0, 0.5)",
      },

      // Indexed scales for backward compatibility
      primary: {
        50: "#F8F9FA",
        100: "#E8F4F8",
        200: "#BFD7EA",
        300: "#9AC2DD",
        400: "#6FADD0",
        500: "#4A90E2",
        600: "#1E2A47",
        700: "#0E1A35",
        800: "#0A1228",
        900: "#060D1C",
      },
      neutral: {
        50: "#F8F9FA",
        100: "#F1F3F5",
        200: "#E9ECEF",
        300: "#DEE2E6",
        400: "#ADB5BD",
        500: "#6B7A99",
        600: "#4A5A7A",
        700: "#3D4F6F",
        800: "#2E3A59",
        900: "#1E2A47",
      },
    },

    space: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      "2xl": 32,
      "3xl": 48,
      "4xl": 64,
      // Numeric aliases for backward compatibility
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 24,
      6: 32,
    },

    radius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      "2xl": 20,
      pill: 999,
      full: 999,
    },

    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        "2xl": 24,
        "3xl": 30,
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

    type: {
      hero: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
      h1: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
      h2: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
      h3: { fontSize: 16, fontWeight: "600", lineHeight: 20 },
      body: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
      bodyLarge: { fontSize: 16, fontWeight: "500", lineHeight: 22 },
      sub: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
      caption: { fontSize: 11, fontWeight: "600", lineHeight: 14 },
      button: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
    },

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
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      },
      sm: {
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
      },
      soft: {
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      },
      card: {
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 4,
      },
      elevated: {
        shadowColor: "#2E3A59",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 5,
      },
      glow: {
        shadowColor: "#A78BFA",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
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

    animation: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      verySlow: 700,
      spring: { damping: 18, stiffness: 180 },
      springGentle: { damping: 25, stiffness: 120 },
      easing: {
        easeInOut: [0.4, 0, 0.2, 1],
        easeOut: [0, 0, 0.2, 1],
        easeIn: [0.4, 0, 1, 1],
        sharp: [0.4, 0, 0.6, 1],
      },
    },

    // Alias for backward compatibility
    get shadows() { return this.shadow; },
    get spacing() { return this.space; },

    touchTarget: {
      min: 44,
      comfortable: 48,
    },

    icon: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 28,
      xl: 32,
      "2xl": 48,
    },
  };
}

// Default tokens (light theme)
export const tokens = getTokens(false);

// Icon mapping (kept for compatibility, removed emojis)
export const joyfulIcons = {
  home: "home",
  dashboard: "dashboard",
  back: "back",
  forward: "forward",
  menu: "menu",
  close: "close",
  settings: "settings",
  activity: "activity",
  activities: "activities",
  meal: "meal",
  meals: "meals",
  media: "media",
  photos: "photos",
  video: "video",
  child: "child",
  children: "children",
  parent: "parent",
  teacher: "teacher",
  student: "student",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  love: "love",
  star: "star",
  trophy: "trophy",
  add: "add",
  edit: "edit",
  delete: "delete",
  save: "save",
  send: "send",
  download: "download",
  upload: "upload",
  chat: "chat",
  ai: "ai",
  notification: "notification",
  message: "message",
  calendar: "calendar",
  clock: "clock",
  today: "today",
  school: "school",
  book: "book",
  pencil: "pencil",
  art: "art",
  music: "music",
  sports: "sports",
  science: "science",
  math: "math",
  breakfast: "breakfast",
  lunch: "lunch",
  snack: "snack",
  dinner: "dinner",
  drink: "drink",
  sun: "sun",
  cloud: "cloud",
  rainbow: "rainbow",
  flower: "flower",
  tree: "tree",
  sparkle: "sparkle",
  magic: "magic",
  gift: "gift",
  balloon: "balloon",
  confetti: "confetti",
};

export default tokens;
