// D-28 regression test — therapyType enum divergence.
//
// Found in the DEEP HARDENING campaign, phase P3. Three layers disagreed:
//
//   UI select      (TherapyFormModal.jsx:64-66) : music, video, content
//   request validator (therapyValidator.js:6)   : video, audio, article,
//                                                 exercise, game, breathing,
//                                                 meditation, other
//   DB model enum  (models/Therapy.js:13)       : music, video, content, art,
//                                                 physical, speech,
//                                                 occupational, other
//
// Intersection of all three: "video" alone. Selecting the UI default "Musiqa"
// produced 400 and the teacher saw an untranslated "Validation failed".
//
// The DB enum is the binding constraint (changing it needs a migration), so
// the validator is what must align. These tests assert that the validator
// accepts exactly the model's enum, and that every option the UI offers is
// inside it.
//
// FAIL-FIRST: fails against the pre-fix validator.

import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

const modelEnum = () => {
  const src = read('models/Therapy.js');
  const m = src.match(/therapyType:\s*\{\s*type:\s*DataTypes\.ENUM\(([^)]*)\)/);
  if (!m) throw new Error('could not read therapyType enum from models/Therapy.js');
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};

const validatorEnum = () => {
  const src = read('validators/therapyValidator.js');
  const m = src.match(/const THERAPY_TYPES\s*=\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error('could not read THERAPY_TYPES from validators/therapyValidator.js');
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};

const uiEnum = () => {
  const src = read('../teacher/src/pages/therapy/TherapyFormModal.jsx');
  // the first <select> in the modal is "Turi *" (therapyType)
  const block = src.slice(src.indexOf('formData.therapyType'), src.indexOf('formData.therapyType') + 900);
  return [...block.matchAll(/<option value="([a-z_]+)"/g)].map((m) => m[1]);
};

describe('D-28 — therapyType must mean the same thing in every layer', () => {
  test('the validator accepts exactly what the model enum allows', () => {
    expect([...validatorEnum()].sort()).toEqual([...modelEnum()].sort());
  });

  test('every type the UI offers is accepted by the validator', () => {
    const v = new Set(validatorEnum());
    const rejected = uiEnum().filter((t) => !v.has(t));
    expect(rejected).toEqual([]);
  });

  test('every type the UI offers is storable by the model', () => {
    const m = new Set(modelEnum());
    const unstorable = uiEnum().filter((t) => !m.has(t));
    expect(unstorable).toEqual([]);
  });

  test('the UI default (music) is usable end to end', () => {
    expect(uiEnum()[0]).toBe('music');
    expect(validatorEnum()).toContain('music');
    expect(modelEnum()).toContain('music');
  });
});
