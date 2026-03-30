/**
 * Theme — re-exports tokens as the single source of truth.
 *
 * Legacy code imported named exports (Colors, Typography, etc.) from this file.
 * Those are now derived from tokens so every value stays in sync.
 */

import tokens, { getTokens, getThemeColors } from './tokens';

// ── Named exports for backward compatibility ──────────────────────────

export const Colors = {
  primary: tokens.colors.primary,
  accent: tokens.colors.accent,
  semantic: tokens.colors.semantic,
  joy: tokens.colors.joy,
  text: tokens.colors.text,
  background: tokens.colors.background,
  surface: tokens.colors.surface,
  card: tokens.colors.card,
  border: tokens.colors.border,
  nav: tokens.colors.nav,
  neutral: tokens.colors.neutral,
  ui: tokens.colors.ui,
};

export const Typography = tokens.typography;
export const TypePresets = tokens.type;
export const Spacing = tokens.space;
export const Radius = tokens.radius;
export const Shadows = tokens.shadow;
export const Gradients = tokens.colors.gradients;
export const Animation = tokens.animation;

// ── Default export (same as tokens) ───────────────────────────────────

export { getTokens, getThemeColors };
export default tokens;
