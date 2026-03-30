/**
 * Theme — re-exports tokens as the single source of truth.
 * All values derived from tokens.js which is aligned to the Figma design template.
 */

import tokens, { getTokens, getThemeColors, palette } from './tokens';

export const Colors = {
  palette,
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
  gradients: tokens.colors.gradients,
};

export const Typography = tokens.typography;
export const TypePresets = tokens.type;
export const Spacing = tokens.space;
export const Radius = tokens.radius;
export const Shadows = tokens.shadow;
export const Glass = tokens.glass;
export const Gradients = tokens.colors.gradients;
export const Animation = tokens.animation;
export const TouchTarget = tokens.touchTarget;
export const Icon = tokens.icon;

export { getTokens, getThemeColors, palette };
export default tokens;
