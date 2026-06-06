/**
 * Shared locale-aware date/time formatter.
 *
 * Single source of truth for portal-wide date rendering. Maps the
 * i18next language code (uz | en | ru) to a BCP-47 locale and formats
 * via Intl.DateTimeFormat. All formatters accept a Date | string | number.
 *
 * Usage:
 *   import { formatDateMedium, formatTime } from '@shared/utils/formatDate';
 *   formatDateMedium(child.dateOfBirth, i18n.language);
 *
 * Do NOT hardcode 'uz-UZ' / 'ru-RU' / 'en-US' in components. Do NOT add
 * per-page formatters. If a new format is needed, add it here.
 */

const LOCALE_MAP = {
  uz: 'uz-Latn-UZ',
  en: 'en-US',
  ru: 'ru-RU',
};

export function resolveLocale(language) {
  if (!language) return LOCALE_MAP.en;
  const base = String(language).split('-')[0];
  return LOCALE_MAP[base] || LOCALE_MAP.en;
}

function toDate(input) {
  if (input instanceof Date) return input;
  if (input == null || input === '') return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateShort(input, language) {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleDateString(resolveLocale(language), { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

export function formatDateMedium(input, language) {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleDateString(resolveLocale(language), { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return ''; }
}

export function formatDateLong(input, language) {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleDateString(resolveLocale(language), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

export function formatTime(input, language) {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleTimeString(resolveLocale(language), { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
}

export function formatDateTime(input, language) {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleString(resolveLocale(language), {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return ''; }
}
