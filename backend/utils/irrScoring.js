/**
 * ИРР deterministic scoring engine — PURE FUNCTION, no DB access.
 *
 * Software direction (locked — OQ-1, IRR-DECISIONS.md):
 *   score 4 = best (can do independently / never shows problem)
 *   score 0 = worst (cannot do / constant problem behavior)
 *
 * Max is always 68 (17 criteria × 4). Criterion 9 scored for ALL children
 * regardless of isHearingSpecific metadata (OQ-1 resolution).
 *
 * @param {number[]} scores  Array of exactly 17 integers, each 0–4.
 * @returns {{ valid: true, totalScore: number, maxPossibleScore: 68 }
 *          |{ valid: false, error: string }}
 */
export function computeAssessmentResult(scores) {
  if (!Array.isArray(scores)) {
    return { valid: false, error: 'ASSESSMENT_INCOMPLETE' };
  }
  if (scores.length !== 17) {
    return { valid: false, error: 'ASSESSMENT_INCOMPLETE' };
  }
  for (const s of scores) {
    if (!Number.isInteger(s) || s < 0 || s > 4) {
      return { valid: false, error: 'ASSESSMENT_INVALID_SCORE' };
    }
  }
  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  return { valid: true, totalScore, maxPossibleScore: 68 };
}
