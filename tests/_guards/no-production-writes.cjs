/* eslint-env node */
/**
 * WP5 — structural block on running the E2E suite against production.
 *
 * What allowed the earlier incident: playwright.config.js hardcodes production
 * Railway hosts as the per-project `baseURL`, and the specs hardcode the same
 * hosts again (54 occurrences across tests/). There is no environment
 * indirection anywhere, so production is not merely the default target — it is
 * the ONLY target. `npx playwright test` on any developer machine, with the
 * seeded production credentials that are committed in credentials.md, writes to
 * the live database.
 *
 * s22v3-blocked-rows.spec.js:313 did exactly that: it uploaded FIXTURE.tinyPng
 * with a `S22V3-${Date.now()}` title, creating a real `media` row attached to a
 * real child, plus an unread notification to that child's parent. It survived
 * until an audit noticed a 1x1 image in a gallery.
 *
 * Convention cannot fix this — the convention WAS "don't run it against prod",
 * and the run happened anyway. This is a globalSetup, so it aborts the entire
 * run before a single spec executes.
 *
 * To run against production deliberately (read-only verification, a release
 * smoke test), set ALLOW_PROD_E2E=true. That makes the decision explicit,
 * greppable in CI logs, and impossible to make by accident.
 */

const PRODUCTION_HOSTS = [
  'uchqun-production-b484.up.railway.app',
  'teacher-production-0647.up.railway.app',
  'government-production.up.railway.app',
  'reception-production-ba41.up.railway.app',
  'admin-production-536f.up.railway.app',
];

/** Exported for the unit test. */
function findProductionTargets(config) {
  const hits = new Set();
  const consider = (value) => {
    if (typeof value !== 'string') return;
    for (const host of PRODUCTION_HOSTS) {
      if (value.includes(host)) hits.add(host);
    }
  };

  consider(config?.use?.baseURL);
  for (const project of config?.projects ?? []) {
    consider(project?.use?.baseURL);
  }
  // Env overrides are just as capable of pointing at production.
  consider(process.env.BASE_URL);
  consider(process.env.PLAYWRIGHT_BASE_URL);
  consider(process.env.VITE_API_URL);

  return [...hits];
}

function assertNotProduction(config, env = process.env) {
  const targets = findProductionTargets(config);
  if (targets.length === 0) return;

  if (env.ALLOW_PROD_E2E === 'true') {
    // Deliberate, and loud enough to see in a CI log.
    // eslint-disable-next-line no-console
    console.warn(
      `\n[no-production-writes] ALLOW_PROD_E2E=true — running against PRODUCTION: ${targets.join(', ')}\n` +
        '[no-production-writes] Anything this run creates is real. Clean up after yourself.\n',
    );
    return;
  }

  throw new Error(
    [
      '',
      'E2E run BLOCKED: the Playwright config targets production.',
      '',
      `  hosts: ${targets.join('\n         ')}`,
      '',
      'These specs create real rows: s22v3-blocked-rows.spec.js once left a media',
      'row and a parent notification attached to a real child in the live database.',
      '',
      'Point the suite at a non-production environment, or — if you genuinely mean',
      'to run against production — set ALLOW_PROD_E2E=true and own the consequences.',
      '',
    ].join('\n'),
  );
}

module.exports = assertNotProduction;
module.exports.assertNotProduction = assertNotProduction;
module.exports.findProductionTargets = findProductionTargets;
module.exports.PRODUCTION_HOSTS = PRODUCTION_HOSTS;
