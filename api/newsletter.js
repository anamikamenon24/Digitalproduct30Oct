import { db } from './_lib/db.js'
import { route, body, badRequest, EMAIL_RE, normalizeEmail } from './_lib/http.js'

// POST /api/newsletter { email } — stored once. Signing up twice is reported, not duplicated.
export default route('POST', async (req, res) => {
  const email = normalizeEmail(body(req).email)
  if (!EMAIL_RE.test(email) || email.length > 254) throw badRequest('Please enter a valid email address.', { field: 'email' })
  const [row] = await db()`
    insert into newsletter_subscribers (email) values (${email})
    on conflict (email) do nothing
    returning id`
  res.status(row ? 201 : 200).json({ subscribed: true, alreadySubscribed: !row })
})
