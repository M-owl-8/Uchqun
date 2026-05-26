import { computeAssessmentResult } from '../../utils/irrScoring.js';

describe('computeAssessmentResult', () => {
  it('all-4s → totalScore 68 (max, all 17 criteria including criterion 9)', () => {
    const scores = Array(17).fill(4);
    const result = computeAssessmentResult(scores);
    expect(result).toEqual({ valid: true, totalScore: 68, maxPossibleScore: 68 });
  });

  it('all-0s → totalScore 0', () => {
    const result = computeAssessmentResult(Array(17).fill(0));
    expect(result).toEqual({ valid: true, totalScore: 0, maxPossibleScore: 68 });
  });

  it('mixed scores → correct deterministic sum', () => {
    // 4+3+2+1+0 + 4+3+2+1+0 + 4+3+2+1+0 + 4+3 = 10+10+10+7 = 37
    const scores = [4, 3, 2, 1, 0, 4, 3, 2, 1, 0, 4, 3, 2, 1, 0, 4, 3];
    const result = computeAssessmentResult(scores);
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(37);
    expect(result.maxPossibleScore).toBe(68);
  });

  it('maxPossibleScore is always 68 regardless of isHearingImpaired (OQ-1)', () => {
    // Criterion 9 is scored for ALL children — max is constant
    const result = computeAssessmentResult(Array(17).fill(4));
    expect(result.maxPossibleScore).toBe(68);
  });

  it('16 scores → ASSESSMENT_INCOMPLETE (missing one criterion)', () => {
    const result = computeAssessmentResult(Array(16).fill(4));
    expect(result).toEqual({ valid: false, error: 'ASSESSMENT_INCOMPLETE' });
  });

  it('18 scores → ASSESSMENT_INCOMPLETE (extra criterion)', () => {
    const result = computeAssessmentResult(Array(18).fill(4));
    expect(result).toEqual({ valid: false, error: 'ASSESSMENT_INCOMPLETE' });
  });

  it('score of 5 → ASSESSMENT_INVALID_SCORE (out of range)', () => {
    const scores = Array(17).fill(3);
    scores[8] = 5;
    const result = computeAssessmentResult(scores);
    expect(result).toEqual({ valid: false, error: 'ASSESSMENT_INVALID_SCORE' });
  });

  it('score of -1 → ASSESSMENT_INVALID_SCORE (negative)', () => {
    const scores = Array(17).fill(2);
    scores[0] = -1;
    const result = computeAssessmentResult(scores);
    expect(result).toEqual({ valid: false, error: 'ASSESSMENT_INVALID_SCORE' });
  });

  it('non-integer score (3.5) → ASSESSMENT_INVALID_SCORE', () => {
    const scores = Array(17).fill(2);
    scores[5] = 3.5;
    const result = computeAssessmentResult(scores);
    expect(result).toEqual({ valid: false, error: 'ASSESSMENT_INVALID_SCORE' });
  });

  it('null in scores array → ASSESSMENT_INVALID_SCORE', () => {
    const scores = Array(17).fill(2);
    scores[0] = null;
    const result = computeAssessmentResult(scores);
    expect(result).toEqual({ valid: false, error: 'ASSESSMENT_INVALID_SCORE' });
  });

  it('non-array input → ASSESSMENT_INCOMPLETE', () => {
    expect(computeAssessmentResult(null)).toEqual({ valid: false, error: 'ASSESSMENT_INCOMPLETE' });
    expect(computeAssessmentResult(undefined)).toEqual({ valid: false, error: 'ASSESSMENT_INCOMPLETE' });
    expect(computeAssessmentResult('1,2,3')).toEqual({ valid: false, error: 'ASSESSMENT_INCOMPLETE' });
    expect(computeAssessmentResult({})).toEqual({ valid: false, error: 'ASSESSMENT_INCOMPLETE' });
  });

  it('criterion 9 (index 8) is included in the sum — not skipped', () => {
    const scores = Array(17).fill(0);
    scores[8] = 4; // criterion 9 only
    const result = computeAssessmentResult(scores);
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(4);
  });
});
