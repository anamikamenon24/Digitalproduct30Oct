import { db } from '../_lib/db.js'
import { route, rawBody } from '../_lib/http.js'
import { verifyWebhook, webhookSecret } from '../_lib/stripe.js'

// POST /api/webhooks/stripe — the ONLY place an order becomes "paid".
// 1) Verify Stripe's signature over the exact raw bytes. 2) Update the order idempotently, so a
// repeated event (Stripe retries) never double-counts anything.
export default route('POST', async (req, res) => {
  const signature = req.headers['stripe-signature']
  if (!signature) return res.status(400).json({ error: 'Missing Stripe signature.' })

  let event
  try {
    event = verifyWebhook(await rawBody(req), signature, webhookSecret())
  } catch (err) {
    if (err.code === 'NO_STRIPE') throw err
    return res.status(400).json({ error: 'Invalid Stripe signature.' })
  }

  const session = event.data?.object ?? {}
  const sql = db()
  let updated = 0

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    if (session.payment_status === 'paid') {
      // Only pending orders whose amount matches exactly are marked paid; "status <> 'paid'" makes retries no-ops.
      const rows = await sql`
        update orders set status = 'paid', paid_at = now()
        where stripe_session_id = ${session.id} and status = 'pending' and total_cents = ${session.amount_total}
        returning id`
      updated = rows.length
      if (!updated) {
        const [o] = await sql`select status, total_cents from orders where stripe_session_id = ${session.id}`
        if (o && o.status === 'pending' && o.total_cents !== session.amount_total) {
          console.error(`[webhook] amount mismatch for session ${session.id}: expected ${o.total_cents}, got ${session.amount_total}`)
          await sql`update orders set status = 'failed' where stripe_session_id = ${session.id} and status = 'pending'`
        }
      }
    }
  } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const rows = await sql`update orders set status = 'failed' where stripe_session_id = ${session.id} and status = 'pending' returning id`
    updated = rows.length
  }

  res.status(200).json({ received: true, updated })
})
