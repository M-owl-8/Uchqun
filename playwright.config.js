const { defineConfig, devices } = require('@playwright/test');

const SCREENS = 'audits/beta/screens';

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
  ],
  outputDir: SCREENS,
});
