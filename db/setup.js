// npm run db:setup — creates the tables (schema.sql) then loads sample data (seed.sql).
// Safe to run again: the schema only creates missing objects and the seed upserts.
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { db, runScript } from '../api/_lib/db.js'

export async function setupDatabase({ quiet = false } = {}) {
  const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8')
  await runScript(read('./schema.sql'))
  await runScript(read('./seed.sql'))
  const [counts] = await db()`
    select (select count(*)::int from categories) as categories,
           (select count(*)::int from products)   as products,
           (select count(*)::int from reviews)    as reviews`
  if (!quiet) console.log('Database ready:', counts)
  return counts
}

// Run directly (npm run db:setup), not when imported by tests.
if (import.meta.main) {
  if (!process.env.DATABASE_URL) {
    console.error(
      '\nDATABASE_URL is missing in .env.\n' +
        'Copy it from the Neon dashboard: console.neon.tech → your project → "Connect" button → copy the connection string.\n',
    )
    process.exit(1)
  }
  setupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nCould not set up the database:', err.message, '\n')
      process.exit(1)
    })
}
