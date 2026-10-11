// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    serviceWorkers: 'block',
    acceptDownloads: true,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1300, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/ }
  ],
  webServer: { command: 'node tests/server.js', port: 4173, reuseExistingServer: !process.env.CI }
});
