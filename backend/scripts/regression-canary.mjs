#!/usr/bin/env node
/**
 * Campaign III P3.4 / L14 — prove the isolation lane still catches the holes it
 * was built for.
 *
 * A lane that has never been observed failing is [UNVERIFIED] however green it
 * is. This reverts each known cross-tenant fix IN THE WORKING TREE ONLY, runs
 * the lane, and requires it to go red naming the right probe. Then it restores
 * and requires green.
 *
 * WHY THIS IS A CI JOB RATHER THAN A ONE-OFF. D-68: Railway's GitHub integration
 * deploys every push to main independently of any gate. Committing a revert of a
 * cross-tenant fix — even for ten minutes, even immediately reverted — would put
 * a live tenant-isolation hole into production. The revert therefore happens
 * inside the runner's checkout and is never committed.
 *
 * As a permanent job it also does more than a one-off would: if a future change
 * makes the lane stop detecting one of these, CI goes red on that alone.
 *
 * D-63 is deliberately NOT in this list. P1 established that its "Admin can
 * access any child" branch is unreachable behind
 * therapyRoutes.js:31 requireRole('parent','teacher'). Reverting it changes no
 * observable behaviour, so a canary that expected a failure there would be
 * asserting something false.
 */
import { execFileSync, spawnSync } from 'child_process';
import process from 'process';

const CASES = [
  {
    id: 'D-47',
    preFix: '6727bc27^',
    files: ['controllers/activityController.js', 'controllers/mealController.js'],
    expectProbes: ['activities?childId', 'meals?childId'],
    what: 'cross-tenant read of activities and meals via a supplied childId',
  },
  {
    id: 'D-61',
    preFix: 'cc9467e2^',
    files: ['controllers/mealPlanController.js'],
    expectProbes: ['meal-plans?childId'],
    what: 'getMealPlans had no access check of any kind, for any role',
  },
  {
    id: 'D-62',
    preFix: 'cc9467e2^',
    files: ['controllers/therapyController.js'],
    expectProbes: ['POST therapy (foreign child)'],
    what: 'createTherapy wrote a TherapyUsage row against another school\'s child',
  },
  {
    id: 'D-64',
    preFix: 'cc9467e2^',
    files: ['controllers/emotionalMonitoringController.js'],
    expectProbes: ['teacher/emotional-monitoring/:childId'],
    what: 'admin and reception fell through unchecked to another school\'s records',
  },
];

const git = (...args) => execFileSync('git', args, { cwd: '..', encoding: 'utf8' });

const runLane = () => {
  const r = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', './node_modules/jest/bin/jest.js',
      '--config', 'jest.integration.config.js', '--runInBand',
      '--testPathPatterns', 'isolation'],
    { encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 }
  );
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};

const restoreAll = () => {
  const files = [...new Set(CASES.flatMap((c) => c.files))];
  git('checkout', 'HEAD', '--', ...files.map((f) => `backend/${f}`));
};

let failures = 0;

console.log('=== P3.4 regression canary — the lane must catch what it was built for ===\n');

for (const c of CASES) {
  console.log(`--- ${c.id}: ${c.what}`);
  console.log(`    reverting ${c.files.join(', ')} to ${c.preFix}`);

  for (const f of c.files) git('checkout', c.preFix, '--', `backend/${f}`);

  const red = runLane();
  restoreAll();

  if (red.code === 0) {
    console.log(`    ❌ ${c.id}: THE LANE DID NOT CATCH IT. The suite passed against the unfixed code.`);
    console.log('       The lane is incomplete for this defect and must be extended.\n');
    failures++;
    continue;
  }

  const named = c.expectProbes.filter((p) => red.out.includes(p));
  if (named.length === 0) {
    console.log(`    ❌ ${c.id}: the lane failed, but named none of ${JSON.stringify(c.expectProbes)}.`);
    console.log('       A red that does not identify the surface is not a detection.\n');
    failures++;
    continue;
  }

  console.log(`    ✅ ${c.id}: lane exited ${red.code} and named ${JSON.stringify(named)}\n`);
}

console.log('--- restoring every file and confirming green ---');
restoreAll();
const green = runLane();
if (green.code !== 0) {
  console.log('❌ the lane is RED against the fixed code — the canary left the tree dirty,');
  console.log('   or something else is broken. Refusing to report success.');
  console.log(green.out.split('\n').filter((l) => /Tests:|✕|●/.test(l)).slice(0, 20).join('\n'));
  process.exit(1);
}
console.log('✅ green against the fixed code\n');

console.log(green.out.split('\n').filter((l) => /Test Suites:|Tests:/.test(l)).join('\n'));

if (failures) {
  console.log(`\n❌ ${failures} of ${CASES.length} known holes are NOT detected by the lane.`);
  process.exit(1);
}
console.log(`\n✅ all ${CASES.length} known holes are detected by the lane, and it is green when they are fixed.`);
