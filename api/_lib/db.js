import { neon } from '@neondatabase/serverless'

// Every route uses the same tagged-template API:  const rows = await db()`select * from x where id = ${id}`
// - Real deployments: DATABASE_URL is a Neon connection string.
// - Tests / offline dev: DATABASE_URL=pglite:memory or pglite:<folder> runs an embedded Postgres (PGlite).
//   PGlite is a dev dependency and is only loaded when explicitly requested, never on Vercel.

let sql

export class DatabaseError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function db() {
  const url = process.env.DATABASE_URL
  if (!url) throw new DatabaseError('NO_DATABASE', 'DATABASE_URL is not set')
  if (sql) return sql
  sql = url.startsWith('pglite:') ? pgliteSql(url.slice('pglite:'.length)) : neon(url)
  return sql
}

// For tests: drop the cached client so a fresh DATABASE_URL takes effect.
export function resetDb() {
  sql = undefined
  pglitePromise = undefined
}

let pglitePromise

function pglite(location) {
  pglitePromise ??= (async () => {
    const { PGlite } = await import('@electric-sql/pglite')
    if (location === 'memory') return new PGlite()
    // PGlite creates the database folder itself but not its parents (e.g. ".data/").
    const { mkdirSync } = await import('node:fs')
    const { dirname, resolve } = await import('node:path')
    mkdirSync(dirname(resolve(location)), { recursive: true })
    return new PGlite(location)
  })()
  return pglitePromise
}

// Wrap PGlite so it behaves like Neon's tagged template (resolves to an array of rows).
function pgliteSql(location) {
  const tag = async (strings, ...values) => {
    const text = strings.reduce((acc, s, i) => acc + `$${i}` + s)
    const pg = await pglite(location)
    return (await pg.query(text, values)).rows
  }
  tag.query = async (text, params = []) => (await (await pglite(location)).query(text, params)).rows
  tag.exec = async (script) => (await pglite(location)).exec(script)
  return tag
}

// Runs a multi-statement SQL script (schema / seed). Neon's HTTP driver only runs one statement per
// call, so this uses its WebSocket Pool instead. Only used by `npm run db:setup` and tests.
export async function runScript(script) {
  const url = process.env.DATABASE_URL
  if (!url) throw new DatabaseError('NO_DATABASE', 'DATABASE_URL is not set')
  if (url.startsWith('pglite:')) return db().exec(script)
  const { Pool } = await import('@neondatabase/serverless')
  const pool = new Pool({ connectionString: url })
  try {
    await pool.query(script)
  } finally {
    await pool.end()
  }
}
