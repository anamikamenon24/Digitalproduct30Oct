import { defineConfig, devices } from '@playwright/test'

// Browser tests run against their own copy of the app on separate ports, with a FRESH local database
// (.data/e2e) and the offline Stripe stand-in, so your real data and dev server are never touched.
const WEB_PORT = 5190
const API_PORT = 3060

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'node scripts/dev-offline.js',
    url: `http://localhost:${WEB_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { WEB_PORT: String(WEB_PORT), API_PORT: String(API_PORT), OFFLINE_DB_DIR: '.data/e2e', FRESH_DB: '1' },
  },
})
