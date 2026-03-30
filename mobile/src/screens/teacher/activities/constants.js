// Service keys for activity services
export const SERVICES_KEYS = [
  'logoped',
  'defektolog',
  'surdoPedagok',
  'abaTeropiya',
  'ergoteropiya',
  'izo',
  'sbo',
  'musiqa',
  'ipoteropiya',
  'umumiyMassaj',
  'gidroVanna',
  'logoMassaj',
  'cme',
  'issiqOvqat',
  'transportXizmati',
];

// Default labels for service keys (used as fallbacks when translations are unavailable)
export const SERVICES_DEFAULT_LABELS = {
  logoped: 'Logoped',
  defektolog: 'Defektolog',
  surdoPedagok: 'SurdoPedagok',
  abaTeropiya: 'AbA teropiya',
  ergoteropiya: 'Ergoteropiya',
  izo: 'Izo',
  sbo: 'SBO',
  musiqa: 'Musiqa',
  ipoteropiya: 'Ipoteropiya',
  umumiyMassaj: 'Umumiy Massaj',
  gidroVanna: 'GidroVanna',
  logoMassaj: 'LogoMassaj',
  cme: 'CME',
  issiqOvqat: 'Issiq ovqat',
  transportXizmati: 'Transport xizmati',
};

/**
 * Build a translated SERVICES_LIST from keys + a translation function.
 * @param {Function} t - i18next translation function
 * @returns {Array<{key: string, label: string}>}
 */
export function buildServicesList(t) {
  return SERVICES_KEYS.map(key => ({
    key,
    label: t(`activitiesPage.services.${key}`, {
      defaultValue: SERVICES_DEFAULT_LABELS[key] || key,
    }),
  }));
}
