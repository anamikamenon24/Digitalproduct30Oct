import Stripe from 'stripe'
import { isProduction } from './http.js'

let client

// Real Stripe client (test or live keys from STRIPE_SECRET_KEY), or — only for local tests and offline
// development with STRIPE_MOCK=1 — an in-memory stand-in. The mock is refused in production.
export function stripe() {
  if (client) return client
  if (process.env.STRIPE_MOCK === '1') {
    if (isProduction()) throw Object.assign(new Error('STRIPE_MOCK is not allowed in production'), { code: 'NO_STRIPE' })
    client = createMockStripe()
    return client
  }
  if (!process.env.STRIPE_SECRET_KEY) throw Object.assign(new Error('STRIPE_SECRET_KEY is not set'), { code: 'NO_STRIPE' })
  client = new Stripe(process.env.STRIPE_SECRET_KEY)
  return client
}

export function webhookSecret() {
  const s = process.env.STRIPE_WEBHOOK_SECRET
  if (!s) throw Object.assign(new Error('STRIPE_WEBHOOK_SECRET is not set'), { code: 'NO_STRIPE' })
  return s
}

export const resetStripe = () => {
  client = undefined
}

// Signature checks always use Stripe's real (offline) verification code, even with the mock.
const signer = new Stripe('sk_test_offline_signature_only')
export const verifyWebhook = (raw, signature, secret) => signer.webhooks.constructEvent(raw, signature, secret)
export const signTestPayload = (payload, secret) => signer.webhooks.generateTestHeaderString({ payload, secret })

// ---- Mock (tests / offline only) -----------------------------------------------------------------
export const mockState = { sessions: new Map(), coupons: [] }

function createMockStripe() {
  return {
    checkout: {
      sessions: {
        async create(params) {
          const id = `cs_test_mock_${Math.random().toString(36).slice(2, 12)}`
          const amount = params.line_items.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0)
          const off = params.discounts?.length ? mockState.coupons.find((c) => c.id === params.discounts[0].coupon)?.amount_off ?? 0 : 0
          const origin = new URL(params.success_url).origin
          const session = {
            id,
            object: 'checkout.session',
            url: `${origin}/mock-checkout?session_id=${id}`,
            amount_subtotal: amount,
            amount_total: amount - off,
            currency: params.currency ?? 'usd',
            metadata: params.metadata ?? {},
            payment_status: 'unpaid',
            status: 'open',
            success_url: params.success_url,
            cancel_url: params.cancel_url,
            params,
          }
          mockState.sessions.set(id, session)
          return session
        },
        async retrieve(id) {
          const s = mockState.sessions.get(id)
          if (!s) throw Object.assign(new Error(`No such checkout.session: ${id}`), { type: 'StripeInvalidRequestError' })
          return s
        },
      },
    },
    coupons: {
      async create(params) {
        const coupon = { id: `coupon_mock_${mockState.coupons.length + 1}`, ...params }
        mockState.coupons.push(coupon)
        return coupon
      },
    },
  }
}
