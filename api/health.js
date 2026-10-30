import { db } from './_lib/db.js'

// Quick check that the API, database and Stripe settings are wired up. Never returns secret values.
export default async function handler(_req, res) {
  const status = {
    api: true,
    database: false,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    jwtConfigured: Boolean(process.env.JWT_SECRET),
  }
  try {
    await db()`select 1`
    status.database = true
  } catch (err) {
    status.databaseError = err.code === 'NO_DATABASE' ? 'DATABASE_URL is missing in .env' : 'Could not reach the database'
  }
  res.status(200).json(status)
}
