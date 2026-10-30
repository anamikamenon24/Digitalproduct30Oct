import { DatabaseError } from './db.js'

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export const badRequest = (msg, extra) => new HttpError(400, msg, extra)
export const unauthorized = (msg = 'Please log in to continue.') => new HttpError(401, msg)
export const notFound = (msg = 'Not found.') => new HttpError(404, msg)

// Wraps a route: checks the HTTP method and turns thrown errors into friendly JSON responses.
export function route(methods, handler) {
  const allowed = [].concat(methods)
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (!allowed.includes(req.method)) {
      res.setHeader('Allow', allowed.join(', '))
      return res.status(405).json({ error: `Use ${allowed.join(' or ')} for this endpoint.` })
    }
    try {
      await handler(req, res)
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra })
      if (err instanceof DatabaseError || isConnectionError(err)) {
        console.error('[api] database unavailable:', err.message)
        return res.status(503).json({ error: "We can't reach the database right now. Please try again in a moment.", code: 'DB_UNAVAILABLE' })
      }
      if (err?.type?.startsWith?.('Stripe') || err?.code === 'NO_STRIPE') {
        console.error('[api] stripe error:', err.message)
        return res.status(502).json({ error: "We can't reach the payment provider right now. Please try again in a moment.", code: 'STRIPE_UNAVAILABLE' })
      }
      console.error(`[api] ${req.method} ${req.url} failed:`, err)
      res.status(500).json({ error: 'Something went wrong on our side. Please try again.' })
    }
  }
}

function isConnectionError(err) {
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|fetch failed|getaddrinfo|Error connecting to database/i.test(String(err?.message ?? ''))
}

// Vercel parses JSON bodies onto req.body; the local server does the same.
export function body(req) {
  const b = req.body
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b
  if (typeof b === 'string') {
    try {
      return JSON.parse(b)
    } catch {
      return {}
    }
  }
  return {}
}

// Exact request bytes, needed for Stripe signature checks. Uses the copy the local server kept,
// otherwise reads the (unconsumed) stream as Vercel provides it.
export async function rawBody(req) {
  if (req.rawBody) return req.rawBody
  const chunks = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export function parseCookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export const isProduction = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)

export function setCookie(res, name, value, { maxAge, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax']
  if (httpOnly) parts.push('HttpOnly')
  if (isProduction()) parts.push('Secure')
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`)
  res.appendHeader('Set-Cookie', parts.join('; '))
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const normalizeEmail = (v) => String(v ?? '').trim().toLowerCase()
