// D-51 regression test — the parent data export returned 500 on every request.
//
// GET /api/v1/parent/me/export is the right-of-access export: every record the
// platform holds about a guardian's child, on a platform holding minors' health
// and safeguarding data. audit_log contains ZERO data_export rows across the
// platform's entire history, because the endpoint has never once succeeded.
//
// Diagnosed in Campaign II P4 using the observability built in the same phase.
// Retrieved from the log sink by correlation id 3e9aedf3-4a1c-491b-8d0e-…:
//
//   {"level":"error","message":"exportMyData error",
//    "error":"column \"telegramUsername\" does not exist","parentId":"5eed1d6f-…"}
//
// parentDataExportController.js:36 asks Sequelize for a `telegramUsername`
// attribute. That column exists in neither the users table nor models/User.js —
// the only mention of it anywhere in the backend is that one attributes list.
//
// FAIL-FIRST: fails against the pre-fix controller.

import fs from 'fs';

const RAW = fs.readFileSync('controllers/parent/parentDataExportController.js', 'utf8');
const USER_MODEL = fs.readFileSync('models/User.js', 'utf8');
// Strip comments: the fix records WHY telegramUsername was removed, and a
// naive whole-file assertion would fail on its own explanation.
const CONTROLLER = RAW.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('D-51 — the data export must not request columns that do not exist', () => {
  test('no executable line references telegramUsername', () => {
    expect(CONTROLLER).not.toContain('telegramUsername');
  });

  test('every attribute the export selects from User exists on the model', () => {
    const m = CONTROLLER.match(/User\.findByPk\([^)]*?attributes:\s*\[([\s\S]*?)\]/);
    expect(m).not.toBeNull();
    const requested = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    // createdAt/updatedAt/deletedAt and id are added by Sequelize itself and
    // never appear as literals in the model definition.
    const AUTO = ['createdAt', 'updatedAt', 'deletedAt', 'id'];
    const missing = requested.filter((a) => !AUTO.includes(a) && !USER_MODEL.includes(a));
    expect(missing).toEqual([]);
  });
});
