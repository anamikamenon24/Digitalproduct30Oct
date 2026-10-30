import { db } from '../_lib/db.js'
import { route, body, HttpError, normalizeEmail } from '../_lib/http.js'
import { checkPassword, hashPassword, startSession, publicUser } from '../_lib/auth.js'

// Same message for unknown email and wrong password, so accounts can't be discovered.
const WRONG = 'That email and password don\'t match. Please try again.'
// Compared against when the email doesn't exist, so both cases take similar time.
let dummyHash
const getDummyHash = () => (dummyHash ??= hashPassword('placeholder-password-for-timing-1'))

export default route('POST', async (req, res) => {
  const { email: rawEmail, password } = body(req)
  const email = normalizeEmail(rawEmail)
  if (!email || typeof password !== 'string' || !password) throw new HttpError(400, 'Enter your email and password.')

  const [user] = await db()`select id, email, full_name, avatar_url, created_at, password_hash from users where email = ${email}`
  const ok = await checkPassword(password, user?.password_hash ?? (await getDummyHash()))
  if (!user || !ok) throw new HttpError(401, WRONG)

  await startSession(res, user.id)
  res.status(200).json({ user: publicUser(user) })
})
