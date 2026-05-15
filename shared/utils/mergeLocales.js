/**
 * Deep-merges shared locale keys with portal-specific locale keys.
 * Portal-specific keys WIN — they can override or extend any shared key.
 *
 * Usage in a portal's i18n.js:
 *   import { mergeLocales } from '@shared/utils/mergeLocales';
 *   import sharedUz from '@shared/locales/uz.json';
 *   import portalUz from './locales/uz/common.json';
 *   const uz = mergeLocales(sharedUz, portalUz);
 */
export function mergeLocales(shared, portal) {
  const result = { ...shared };
  for (const key of Object.keys(portal)) {
    if (
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key]) &&
      typeof portal[key] === 'object' &&
      !Array.isArray(portal[key])
    ) {
      result[key] = { ...result[key], ...portal[key] };
    } else {
      result[key] = portal[key];
    }
  }
  return result;
}
