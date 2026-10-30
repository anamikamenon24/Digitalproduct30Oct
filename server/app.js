// Builds an Express app that serves every file in /api exactly as Vercel routes them:
//   api/auth/login.js       -> /api/auth/login
//   api/products/index.js   -> /api/products
//   api/products/[slug].js  -> /api/products/:slug   (value on req.query.slug, like Vercel)
// Files and folders starting with "_" (api/_lib) are helpers, not routes — the same rule Vercel uses.
// Used by the local dev server (server/dev.js) and by the backend tests, so both exercise real routes.
import express from 'express'
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const apiDir = fileURLToPath(new URL('../api', import.meta.url))

function findRoutes(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) files.push(...findRoutes(full))
    else if (name.endsWith('.js')) files.push(full)
  }
  return files
}

function toRoutePath(file) {
  const parts = relative(apiDir, file).replace(/\.js$/, '').split(sep)
  if (parts.at(-1) === 'index') parts.pop()
  return '/api/' + parts.map((p) => p.replace(/^\[(.+)\]$/, ':$1')).join('/')
}

export function listRoutes() {
  return (
    findRoutes(apiDir)
      .map((file) => ({ file, path: toRoutePath(file) }))
      // Static segments win over dynamic ones, as on Vercel.
      .sort((a, b) => a.path.split(':').length - b.path.split(':').length)
  )
}

// hot: re-import a route file when it changes (dev). Tests import each file once.
export async function createApp({ hot = false } = {}) {
  const app = express()
  app.disable('x-powered-by')

  // Keep the exact raw bytes (Stripe signatures need them) and expose parsed JSON on req.body,
  // matching what a Vercel function receives.
  app.use(express.raw({ type: () => true, limit: '1mb' }))
  app.use((req, _res, next) => {
    req.rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    const type = req.headers['content-type'] || ''
    if (type.includes('application/json') && req.rawBody.length) {
      try {
        req.body = JSON.parse(req.rawBody.toString('utf8'))
      } catch {
        req.body = null
      }
    } else if (!req.rawBody.length) req.body = undefined
    next()
  })

  const routes = listRoutes()
  const loaded = new Map()
  // Node needs file:// URLs for absolute Windows paths; Vitest's loader needs plain paths (it can't
  // resolve the %20 that a space in the folder name becomes).
  const specifier = (file) => (process.env.VITEST ? file : pathToFileURL(file).href)
  for (const { file, path } of routes) {
    if (!hot) loaded.set(file, (await import(specifier(file))).default)
    app.all(path, async (req, res) => {
      try {
        const handler = hot ? (await import(`${pathToFileURL(file).href}?t=${statSync(file).mtimeMs}`)).default : loaded.get(file)
        // Vercel puts both querystring values and [param] values on req.query.
        Object.defineProperty(req, 'query', { value: { ...req.query, ...req.params }, writable: true, configurable: true })
        await handler(req, res)
      } catch (err) {
        console.error(`[api] ${req.method} ${req.originalUrl} failed:`, err)
        if (!res.headersSent) res.status(500).json({ error: 'Something went wrong on our side. Please try again.' })
      }
    })
  }
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

  // Offline stand-in for Stripe's hosted checkout page. Only exists with STRIPE_MOCK=1 on a local
  // machine; it lives outside /api so it can never be deployed to Vercel.
  if (process.env.STRIPE_MOCK === '1' && !process.env.VERCEL) {
    const { mountMockCheckout } = await import('./mock-checkout.js')
    mountMockCheckout(app)
  }

  return { app, routes }
}
