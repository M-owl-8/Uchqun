import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * WP5 — the E2E suite must not be able to write to production by default.
 *
 * s22v3-blocked-rows.spec.js:313 created a real media row and a parent
 * notification in the live database because playwright.config.js hardcodes
 * production hosts and nothing stopped a local run.
 *
 * Two things have to hold, and both are asserted here because they fail
 * independently: the guard must refuse a production target, and it must still
 * be WIRED into playwright.config.js as globalSetup. A guard that exists but is
 * not wired is exactly the "discouraged by convention" state this replaces.
 */

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GUARD = path.join(ROOT, 'tests/_guards/no-production-writes.cjs');
const CONFIG = path.join(ROOT, 'playwright.config.js');

const { assertNotProduction, findProductionTargets, PRODUCTION_HOSTS } = require(GUARD);

const prodConfig = () => ({
  use: { baseURL: 'https://teacher-production-0647.up.railway.app' },
  projects: [{ use: { baseURL: 'https://uchqun-production-b484.up.railway.app' } }],
});
const localConfig = () => ({
  use: { baseURL: 'http://localhost:5174' },
  projects: [{ use: { baseURL: 'http://localhost:5000' } }],
});

describe('Playwright production guard', () => {
  it('throws when the config targets a production host', () => {
    expect(() => assertNotProduction(prodConfig(), {})).toThrow(/BLOCKED/);
  });

  it('names the offending hosts in the error', () => {
    expect(() => assertNotProduction(prodConfig(), {})).toThrow(/teacher-production-0647/);
  });

  it('allows a local target', () => {
    expect(() => assertNotProduction(localConfig(), {})).not.toThrow();
  });

  it('permits production only on the explicit opt-in', () => {
    expect(() => assertNotProduction(prodConfig(), { ALLOW_PROD_E2E: 'true' })).not.toThrow();
    // anything other than the exact string must still block
    expect(() => assertNotProduction(prodConfig(), { ALLOW_PROD_E2E: '1' })).toThrow(/BLOCKED/);
    expect(() => assertNotProduction(prodConfig(), { ALLOW_PROD_E2E: 'yes' })).toThrow(/BLOCKED/);
  });

  it('catches a production host supplied through env overrides', () => {
    const saved = process.env.BASE_URL;
    process.env.BASE_URL = 'https://admin-production-536f.up.railway.app';
    try {
      expect(findProductionTargets(localConfig())).toContain('admin-production-536f.up.railway.app');
    } finally {
      if (saved === undefined) delete process.env.BASE_URL;
      else process.env.BASE_URL = saved;
    }
  });

  it('covers every production host the config actually uses', () => {
    const config = readFileSync(CONFIG, 'utf8');
    const used = [...config.matchAll(/https:\/\/([a-z0-9-]+\.up\.railway\.app)/g)].map((m) => m[1]);
    for (const host of new Set(used)) {
      expect(PRODUCTION_HOSTS).toContain(host);
    }
  });

  // A guard that is not wired protects nothing. Assert the RESOLVED config
  // value, not the file text: `const globalSetup = require.resolve(...)` keeps
  // the string present even when the property is commented out, so a text match
  // here passes while the guard is completely disabled.
  it('is wired into playwright.config.js as globalSetup', () => {
    expect(existsSync(GUARD)).toBe(true);
    const config = require(CONFIG);
    expect(typeof config.globalSetup).toBe('string');
    expect(config.globalSetup).toMatch(/global-setup\.cjs$/);
    expect(existsSync(config.globalSetup)).toBe(true);
  });

  it('the wired globalSetup actually invokes the guard', async () => {
    const config = require(CONFIG);
    const globalSetup = require(config.globalSetup);
    await expect(
      globalSetup({ projects: [{ use: { baseURL: 'https://teacher-production-0647.up.railway.app' } }] }),
    ).rejects.toThrow(/BLOCKED/);
  });
});
