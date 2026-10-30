// Local development API server. `npm run dev` starts this alongside Vite, which proxies /api here.
import 'dotenv/config'
import { createApp } from './app.js'

const PORT = Number(process.env.API_PORT || 3051)

function checkEnv() {
  const mock = process.env.STRIPE_MOCK === '1'
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
    .filter((k) => !process.env[k])
    .filter((k) => !(mock && k === 'STRIPE_SECRET_KEY'))
  if (missing.length) console.warn(`\n[api] Missing in .env: ${missing.join(', ')}. Routes that need them will return a clear error.\n`)
  if (process.env.STRIPE_MOCK === '1') console.warn('[api] STRIPE_MOCK=1: using the offline fake checkout (no real Stripe calls).')
  if (process.env.DATABASE_URL?.startsWith('pglite:')) console.warn(`[api] Using local embedded database (${process.env.DATABASE_URL}).`)
}

// Offline mode creates and seeds the embedded database in this same process (PGlite allows one
// process per database folder).
if (process.env.DB_SETUP_ON_START === '1') {
  const { setupDatabase } = await import('../db/setup.js')
  await setupDatabase()
}

const { app, routes } = await createApp({ hot: true })

app.listen(PORT, (err) => {
  // Express 5 passes listen errors (e.g. port already in use) to this callback.
  if (err) {
    console.error(`[api] Could not start on port ${PORT}: ${err.code === 'EADDRINUSE' ? 'another app is already using it. Set API_PORT in .env to a free port.' : err.message}`)
    process.exit(1)
  }
  checkEnv()
  console.log(`[api] ${routes.length} routes ready on http://localhost:${PORT}`)
})
