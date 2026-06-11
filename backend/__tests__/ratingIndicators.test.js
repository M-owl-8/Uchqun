/**
 * PL-015 ship gate (Q3) — the rating indicator config must never carry the
 * historical positional filler labels. If filler reappears, this suite fails
 * and the frontends hide their rating forms (containsFillerIndicators).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PARENT_INDICATORS,
  GOV_INDICATORS,
  containsFillerIndicators,
} from '../config/ratingIndicators.js';

describe('PL-015 — rating indicator config', () => {
  test('SHIP GATE: live config contains no positional filler labels', () => {
    expect(containsFillerIndicators(PARENT_INDICATORS)).toBe(false);
    expect(containsFillerIndicators(GOV_INDICATORS)).toBe(false);
  });

  test('detector fires on filler in any of the three languages', () => {
    expect(containsFillerIndicators([{ key: 'x', en: 'Indicator 1', uz: 'Real', ru: 'Real' }])).toBe(true);
    expect(containsFillerIndicators([{ key: 'x', en: 'Real', uz: "Ko'rsatkich 3", ru: 'Real' }])).toBe(true);
    expect(containsFillerIndicators([{ key: 'x', en: 'Real', uz: 'Real', ru: 'Показатель 5' }])).toBe(true);
    expect(containsFillerIndicators([{ key: 'x', en: 'Real', uz: 'Real', ru: ' Показатель 2 ' }])).toBe(true);
  });

  test('detector passes on the real owner-provided names', () => {
    expect(containsFillerIndicators([
      { key: 'x', en: 'Institution cleanliness', uz: 'Muassasa tozaligi', ru: 'Чистота учреждения' },
    ])).toBe(false);
  });

  test('keys are unchanged (stored ratings + validators reference them)', () => {
    expect(PARENT_INDICATORS.map((i) => i.key)).toEqual([
      'parent_indicator_1', 'parent_indicator_2', 'parent_indicator_3', 'parent_indicator_4', 'parent_indicator_5',
    ]);
    expect(GOV_INDICATORS.map((i) => i.key)).toEqual([
      'gov_indicator_1', 'gov_indicator_2', 'gov_indicator_3', 'gov_indicator_4', 'gov_indicator_5',
    ]);
  });

  test('both directions use the same five names (Q2)', () => {
    const labels = (list) => list.map(({ en, uz, ru }) => ({ en, uz, ru }));
    expect(labels(PARENT_INDICATORS)).toEqual(labels(GOV_INDICATORS));
  });

  test('backend copy stays in sync with shared/config copy', () => {
    const sharedSrc = readFileSync(join(process.cwd(), '..', 'shared', 'config', 'ratingIndicators.js'), 'utf8');
    for (const ind of [...PARENT_INDICATORS, ...GOV_INDICATORS]) {
      expect(sharedSrc).toContain(ind.uz);
      expect(sharedSrc).toContain(ind.ru);
      expect(sharedSrc).toContain(ind.key);
    }
  });
});
