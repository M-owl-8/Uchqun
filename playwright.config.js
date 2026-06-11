const { defineConfig, devices } = require('@playwright/test');

// outputDir is CLEANED by Playwright at every run start. It must NEVER point at
// audits/beta/screens — that directory holds committed audit evidence (S23
// lesson: a proof run deleted four committed PNGs mid-session). Failure
// artifacts go to the disposable, git-ignored dir below; specs that save
// evidence screenshots write explicitly into audits/beta/screens themselves.
const ARTIFACTS = '.playwright-artifacts';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 45000,
  expect: { timeout: 12000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'audits/beta/playwright-results.json' }],
  ],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'def013',
      testMatch: '**/def013-chat-fix-proof.spec.js',
      timeout: 120000,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60000,
        actionTimeout: 30000,
      },
    },
    {
      name: 'ux01',
      testMatch: '**/ux01-confirm-dialogs-proof.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'iso22',
      testMatch: '**/iso22-v1-isolation-probes.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 's22v3',
      testMatch: '**/s22v3-blocked-rows.spec.js',
      timeout: 90000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60000,
        actionTimeout: 30000,
      },
    },
    {
      name: 'recon22',
      testMatch: '**/recon22-v2-reconciliation-probes.spec.js',
      timeout: 90000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60000,
        actionTimeout: 30000,
      },
    },
    {
      name: 'ux02',
      testMatch: '**/ux02-attendance-correction-proof.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://teacher-production-0647.up.railway.app',
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
    {
      name: 'def004',
      testMatch: '**/def004-provision-grants-proof.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://government-production.up.railway.app',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'def006',
      testMatch: '**/def006-must-change-password-proof.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://teacher-production-0647.up.railway.app',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'def007',
      testMatch: '**/def007-cold-load-proof.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://teacher-production-0647.up.railway.app',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'def010',
      testMatch: '**/def010-modal-layout-proof.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://teacher-production-0647.up.railway.app',
      },
    },
    {
      name: 'wave1',
      testMatch: '**/wave1-reception.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://reception-production-ba41.up.railway.app',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'wave2',
      testMatch: '**/wave2-teacher.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://teacher-production-0647.up.railway.app',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'wave3-mobile',
      testMatch: '**/wave3-parent.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://teacher-production-0647.up.railway.app',
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
    {
      name: 'wave4',
      testMatch: '**/wave4-admin.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://admin-production-536f.up.railway.app',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'wave5-6',
      testMatch: '**/wave5-6-government.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://government-production.up.railway.app',
        viewport: { width: 1280, height: 800 },
      },
    },
    // ── S22-V4 hard-assert PARTIAL rows ──────────────────────────────────
    {
      name: 's22v4-reception',
      testMatch: '**/s22v4-reception.spec.js',
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
    {
      name: 's22v4-teacher',
      testMatch: '**/s22v4-teacher.spec.js',
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
    {
      name: 's22v4-parent',
      testMatch: '**/s22v4-parent.spec.js',
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
    {
      name: 's22v4-admin',
      testMatch: '**/s22v4-admin.spec.js',
      timeout: 120_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
    {
      name: 's22v4-government',
      testMatch: '**/s22v4-government.spec.js',
      timeout: 120_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
    {
      name: 's23-def009',
      testMatch: '**/s23-def009-proof.spec.js',
      timeout: 120_000,
      use: {
        ...devices['Desktop Chrome'],
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
    {
      name: 's26-recon',
      testMatch: '**/s26-knownfail-recon.spec.js',
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
    {
      name: 's22v4-probe',
      testMatch: '**/s22v4-probe*.spec.js',
      timeout: 180_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        navigationTimeout: 60_000,
        actionTimeout: 30_000,
      },
    },
  ],
  outputDir: ARTIFACTS,
});
