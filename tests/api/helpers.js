import request from 'supertest'
import { createApp } from '../../server/app.js'
import { setupDatabase } from '../../db/setup.js'
import { db } from '../../api/_lib/db.js'
import { mockState, signTestPayload } from '../../api/_lib/stripe.js'

let appPromise

// Sets up the schema + seed once per test file and returns the Express app serving /api.
export function getApp() {
  appPromise ??= (async () => {
    await setupDatabase({ quiet: true })
    return (await createApp()).app
  })()
  return appPromise
}

const RUN = Date.now().toString(36)
let n = 0
// Every test user has a unique @pixelora.test address so cleanup can find (and only find) them.
export const testEmail = (label = 'user') => `test+${label}-${RUN}-${++n}@pixelora.test`
export const PASSWORD = 'Test1234!'

// A cookie-keeping client, like one browser tab.
export async function agent() {
  return request.agent(await getApp())
}

export async function signedUpAgent(label) {
  const a = await agent()
  const email = testEmail(label)
  const res = await a.post('/api/auth/signup').send({ email, password: PASSWORD, fullName: `Tester ${label}` })
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { agent: a, email, user: res.body.user }
}

export async function productBySlug(slug) {
  const [p] = await db()`select id, slug, price_cents from products where slug = ${slug}`
  return p
}

// Sends a Stripe-signed webhook event, as Stripe would.
export async function sendWebhook(event, { secret = process.env.STRIPE_WEBHOOK_SECRET, signature } = {}) {
  const payload = JSON.stringify(event)
  const req = request(await getApp())
    .post('/api/webhooks/stripe')
    .set('content-type', 'application/json')
  if (signature !== null) req.set('stripe-signature', signature ?? signTestPayload(payload, secret))
  return req.send(payload)
}

export function paidEvent(sessionId, { amountTotal, id = `evt_${Math.random().toString(36).slice(2)}` } = {}) {
  const session = mockState.sessions.get(sessionId)
  return {
    id,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { id: sessionId, object: 'checkout.session', payment_status: 'paid', amount_total: amountTotal ?? session?.amount_total } },
  }
}

// Checkout + successful payment webhook. Returns the order number and Stripe session id.
export async function buy(a, slugs, discountCode) {
  const res = await a.post('/api/checkout').send({ items: slugs.map((slug) => ({ slug, quantity: 1 })), discountCode })
  if (res.status !== 201) throw new Error(`checkout failed: ${res.status} ${JSON.stringify(res.body)}`)
  const sessionId = new URL(res.body.url).searchParams.get('session_id')
  const hook = await sendWebhook(paidEvent(sessionId))
  if (hook.status !== 200) throw new Error(`webhook failed: ${hook.status}`)
  return { orderNumber: res.body.orderNumber, sessionId, totals: res.body.totals }
}

// Removes every user (and, via cascades, their orders/reviews) created by this test run.
export async function cleanup() {
  await db()`delete from users where email like ${`test+%-${RUN}-%@pixelora.test`}`
  await db()`delete from newsletter_subscribers where email like ${`%-${RUN}%@pixelora.test`}`
}
