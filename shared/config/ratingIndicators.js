// PL-015 — RESOLVED 2026-06-11: indicator names provided by the platform owner
// (questionnaire Q1/Q2). Uzbek is the authoritative source; ru/en render the
// same five meanings. Both rating directions use the same five names (Q2).
// Do NOT change the keys — every frontend, the backend validators, and stored
// rating rows reference them.
//
// PL-015 SHIP GATE (Q3): containsFillerIndicators() below is checked by the
// parent school-rating form (teacher/src/parent/pages/TeacherRating.jsx) and
// the government rate-school modal (government/src/pages/SchoolDetail.jsx).
// If positional filler labels ever reappear, those forms hide themselves and
// the ratingIndicators unit tests fail.

export const PARENT_INDICATORS = [
  { key: 'parent_indicator_1', en: 'Institution cleanliness',  uz: 'Muassasa tozaligi',     ru: 'Чистота учреждения' },
  { key: 'parent_indicator_2', en: 'Service quality',          uz: 'Xizmat sifati',         ru: 'Качество услуг' },
  { key: 'parent_indicator_3', en: 'Institution caregiver',    uz: 'Muassasa tarbiyachisi', ru: 'Воспитатель учреждения' },
  { key: 'parent_indicator_4', en: "Child's development",      uz: "Bolaning o'sishi",      ru: 'Развитие ребёнка' },
  { key: 'parent_indicator_5', en: 'Trust in the institution', uz: 'Muassasaga ishonch',    ru: 'Доверие к учреждению' },
];

export const GOV_INDICATORS = [
  { key: 'gov_indicator_1', en: 'Institution cleanliness',  uz: 'Muassasa tozaligi',     ru: 'Чистота учреждения' },
  { key: 'gov_indicator_2', en: 'Service quality',          uz: 'Xizmat sifati',         ru: 'Качество услуг' },
  { key: 'gov_indicator_3', en: 'Institution caregiver',    uz: 'Muassasa tarbiyachisi', ru: 'Воспитатель учреждения' },
  { key: 'gov_indicator_4', en: "Child's development",      uz: "Bolaning o'sishi",      ru: 'Развитие ребёнка' },
  { key: 'gov_indicator_5', en: 'Trust in the institution', uz: 'Muassasaga ishonch',    ru: 'Доверие к учреждению' },
];

// Matches the historical positional fillers: "Ko'rsatkich 3", "Indicator 1", "Показатель 5".
export const FILLER_INDICATOR_RE = /^(Ko'rsatkich|Indicator|Показатель)\s*\d+$/;

export function containsFillerIndicators(indicators) {
  return indicators.some((ind) =>
    [ind.en, ind.uz, ind.ru].some((label) => FILLER_INDICATOR_RE.test(String(label || '').trim()))
  );
}
