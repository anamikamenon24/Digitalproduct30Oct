import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './db.js'
import { parseCookies, setCookie, unauthorized } from './http.js'

export const SESSION_COOKIE = 'px_session'
// Not secret and not used for auth: it only tells the browser "a session probably exists", so a
// logged-out visitor doesn't need to call /api/auth/me (and see a 401 in the console) on every page.
export const HINT_COOKIE = 'px_has_session'
const SESSION_DAYS = 7

function secret() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) throw new Error('JWT_SECRET is missing or too short (needs 32+ characters)')
  return new TextEncoder().encode(s)
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10)
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash)

// Returns a message describing what's wrong with the password, or null when it's acceptable.
export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length === 0) return 'Please choose a password.'
  if (pw.length < 8) return 'Your password needs at least 8 characters.'
  if (pw.length > 72) return 'Your password can be at most 72 characters.'
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use at least one letter and one number in your password.'
  return null
}

export async function startSession(res, userId) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret())
  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 24 * 60 * 60 })
  setCookie(res, HINT_COOKIE, '1', { maxAge: SESSION_DAYS * 24 * 60 * 60, httpOnly: false })
}

export function endSession(res) {
  setCookie(res, SESSION_COOKIE, '', { maxAge: 0 })
  setCookie(res, HINT_COOKIE, '', { maxAge: 0, httpOnly: false })
}

// The logged-in user, or null. A bad, expired or tampered token simply counts as logged out.
export async function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE]
  if (!token) return null
  let userId
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    userId = Number(payload.sub)
  } catch {
    return null
  }
  if (!Number.isInteger(userId)) return null
  const [user] = await db()`select id, email, full_name, avatar_url, created_at from users where id = ${userId}`
  return user ?? null
}

export async function requireUser(req) {
  const user = await currentUser(req)
  if (!user) throw unauthorized()
  return user
}

export const publicUser = (u) => ({ id: u.id, email: u.email, fullName: u.full_name, avatarUrl: u.avatar_url, createdAt: u.created_at })
