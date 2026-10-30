import { db } from '../_lib/db.js'
import { route, body, badRequest, HttpError, EMAIL_RE, normalizeEmail } from '../_lib/http.js'
import { hashPassword, passwordProblem, startSession, publicUser } from '../_lib/auth.js'

export default route('POST', async (req, res) => {
  const { email: rawEmail, password, fullName } = body(req)
  const email = normalizeEmail(rawEmail)
  const name = String(fullName ?? '').trim()

  if (!EMAIL_RE.test(email)) throw badRequest('Enter an email like name@example.com.', { field: 'email' })
  if (name.length < 2) throw badRequest('Enter your full name (at least 2 letters).', { field: 'fullName' })
  const problem = passwordProblem(password)
  if (problem) throw badRequest(problem, { field: 'password' })

  const hash = await hashPassword(password)
  // "on conflict do nothing" makes the duplicate check race-free.
  const [user] = await db()`
    insert into users (email, password_hash, full_name) values (${email}, ${hash}, ${name.slice(0, 80)})
    on conflict (email) do nothing
    returning id, email, full_name, avatar_url, created_at`
  if (!user) throw new HttpError(409, 'An account with this email already exists. Try logging in instead.', { field: 'email' })

  await startSession(res, user.id)
  res.status(201).json({ user: publicUser(user) })
})
