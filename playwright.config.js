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
