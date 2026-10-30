import { defineConfig } from 'vitest/config'

// Backend + money tests. Each test file runs in its own process with its own in-memory Postgres
// (PGlite) and a mocked Stripe, so real data is never touched and no network is used.
// Set TEST_DATABASE_URL to run against a separate real database (e.g. a Neon test branch) instead.
export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.js', 'tests/unit/**/*.test.js'],
    environment: 'node',
    pool: 'forks',
    testTimeout: 30000,
    hookTimeout: 60000,
    setupFiles: ['tests/api/setup-env.js'],
  },
})
