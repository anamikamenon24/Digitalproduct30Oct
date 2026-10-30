import { db } from './db.js'

// Active discount code row ({ code, percent_off }) or null. Codes are case-insensitive.
export async function findDiscount(rawCode) {
  const code = String(rawCode ?? '').trim().toUpperCase()
  if (!code || code.length > 40) return null
  const [row] = await db()`select code, percent_off from discount_codes where code = ${code} and active`
  return row ?? null
}
