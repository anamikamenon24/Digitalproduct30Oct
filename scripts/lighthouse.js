// Lighthouse check of the PRODUCTION build (what Vercel will serve), on Home, Shop and a product page.
// Starts the API offline (local database, no keys) + `vite preview`, runs Lighthouse in mobile and
// desktop modes, prints the four category scores and saves full reports to .lighthouse/.
//   node scripts/lighthouse.js [label]
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import * as chromeLauncher from 'chrome-launcher'
import { chromium } from '@playwright/test'

const label = process.argv[2] || 'run'
const API_PORT = 3070
const WEB_PORT = 4173 // note: 4190 is on the browsers' blocked "unsafe ports" list
const PAGES = { Home: '/', Shop: '/shop', Product: '/product/nova-grotesk' }

const env = {
  ...process.env,
  API_PORT: String(API_PORT),
  DATABASE_URL: 'pglite:.data/lighthouse',
  DB_SETUP_ON_START: '1',
  STRIPE_MOCK: '1',
  STRIPE_WEBHOOK_SECRET: 'whsec_offline_local_only',
  JWT_SECRET: 'lighthouse-offline-secret-0123456789abcdefghijklmnop',
}
rmSync('.data/lighthouse', { recursive: true, force: true })

const procs = []
const start = (cmd) => {
  const p = spawn(cmd, { env, shell: true, stdio: 'ignore' })
  procs.push(p)
  return p
}
const stopAll = () => {
  for (const p of procs) {
    // Synchronous, so the servers are really gone before this script exits.
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' })
    else p.kill('SIGTERM')
  }
}

async function waitFor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

try {
  start('node server/dev.js')
  await waitFor(`http://localhost:${API_PORT}/api/health`)
  // Bind to an explicit IPv4 address: on Windows "localhost" can resolve differently for Vite and Node.
  start(`npx vite preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`)
  await waitFor(`http://127.0.0.1:${WEB_PORT}/`)

  const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] })
  const results = {}
  mkdirSync('.lighthouse', { recursive: true })
  try {
    for (const mode of ['mobile', 'desktop']) {
      for (const [name, path] of Object.entries(PAGES)) {
        const url = `http://127.0.0.1:${WEB_PORT}${path}`
        const run = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error' }, mode === 'desktop' ? desktopConfig : undefined)
        const lhr = run.lhr
        const score = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100)
        results[`${mode} ${name}`] = {
          Performance: score('performance'),
          Accessibility: score('accessibility'),
          'Best Practices': score('best-practices'),
          SEO: score('seo'),
        }
        const failing = Object.values(lhr.audits)
          .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual')
          .map((a) => `${a.id} (${Math.round(a.score * 100)})${a.displayValue ? ': ' + a.displayValue : ''}`)
        results[`${mode} ${name}`].failing = failing
        writeFileSync(`.lighthouse/${label}-${mode}-${name.toLowerCase()}.json`, run.report)
      }
    }
  } finally {
    await chrome.kill()
  }
  writeFileSync(`.lighthouse/${label}-summary.json`, JSON.stringify(results, null, 2))
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k.padEnd(16)} Perf ${v.Performance}  A11y ${v.Accessibility}  BP ${v['Best Practices']}  SEO ${v.SEO}`)
    if (v.failing.length) console.log(`   below 90: ${v.failing.join('; ')}`)
  }
} finally {
  stopAll()
}
process.exit(0)
