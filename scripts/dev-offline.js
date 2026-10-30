// Runs Pixelora locally WITHOUT Neon or Stripe keys:
//   - an embedded Postgres saved in .data/ (PGlite), created and seeded on start
//   - a fake Stripe checkout page (STRIPE_MOCK=1) that sends real, signed webhooks
// Used by `npm run dev:offline` and by the Playwright browser tests (with their own ports + database).
// Nothing here is used on Vercel. For the real thing, fill in .env and use `npm run dev`.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'

const webPort = process.env.WEB_PORT || '5180'
const apiPort = process.env.API_PORT || '3051'
const dbDir = process.env.OFFLINE_DB_DIR || '.data/dev'
if (process.env.FRESH_DB === '1') rmSync(dbDir, { recursive: true, force: true })

const env = {
  ...process.env,
  API_PORT: apiPort,
  DATABASE_URL: `pglite:${dbDir}`,
  STRIPE_MOCK: '1',
  STRIPE_WEBHOOK_SECRET: 'whsec_offline_local_only',
  DB_SETUP_ON_START: '1',
  JWT_SECRET: process.env.JWT_SECRET || 'offline-dev-secret-not-for-production-0123456789abcdef',
}

// One quoted command string: with shell: true, Windows would otherwise split "node server/dev.js".
const command = `npx concurrently -k -n web,api -c magenta,cyan "vite --port ${webPort} --strictPort" "node server/dev.js"`
const child = spawn(command, { env, stdio: 'inherit', shell: true })
child.on('exit', (code) => process.exit(code ?? 0))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
