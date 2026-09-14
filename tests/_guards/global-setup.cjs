/* eslint-env node */
// Playwright globalSetup: refuses to run the suite against production.
// See tests/_guards/no-production-writes.cjs for the rationale.
const assertNotProduction = require('./no-production-writes.cjs');

module.exports = async (config) => {
  // Playwright passes the resolved FullConfig; it exposes projects[].use.
  assertNotProduction({
    use: config?.projects?.[0]?.use,
    projects: config?.projects ?? [],
  });
};
