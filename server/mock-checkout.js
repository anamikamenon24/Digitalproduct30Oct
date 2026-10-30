// Offline fake of Stripe's hosted checkout page (STRIPE_MOCK=1, local only).
// "Pay" sends a properly SIGNED checkout.session.completed event to the real webhook route, so the
// order is marked paid by exactly the same code path real Stripe uses.
import { mockState, signTestPayload, webhookSecret } from '../api/_lib/stripe.js'

const page = (s, error) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test checkout · Pixelora</title><meta name="description" content="Offline test payment page for local development.">
<style>body{font-family:system-ui,sans-serif;background:#07060d;color:#f4f1ff;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
main{max-width:380px;width:100%;background:#151227;border:1px solid #2a2445;border-radius:24px;padding:28px}h1{font-size:20px;margin:0 0 4px}
p{color:#b9b2d6;font-size:14px}label{display:block;font-size:13px;margin:16px 0 6px}input{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid #3a3360;background:#0d0b18;color:#fff;font-size:16px}
button{margin-top:20px;width:100%;padding:14px;border:0;border-radius:999px;background:linear-gradient(100deg,#7c3aed,#db2777);color:#fff;font-weight:700;font-size:16px;cursor:pointer}
.total{font-size:28px;font-weight:800;margin:12px 0}.err{color:#f472b6}</style></head><body><main>
<h1>Test payment (offline)</h1><p>This local page stands in for Stripe Checkout. No money moves.</p>
<div class="total">$${(s.amount_total / 100).toFixed(2)}</div>
<form method="post"><label for="card">Card number</label><input id="card" name="card" inputmode="numeric" autocomplete="off" value="" placeholder="4242 4242 4242 4242" required>
${error ? `<p class="err" role="alert">${error}</p>` : ''}<button type="submit">Pay</button></form>
<p><a style="color:#a78bfa" href="${s.cancel_url}">Cancel and go back</a></p></main></body></html>`

export function mountMockCheckout(app) {
  app.get('/mock-checkout', (req, res) => {
    const s = mockState.sessions.get(String(req.query.session_id))
    if (!s) return res.status(404).send('Unknown test session')
    res.type('html').send(page(s))
  })

  app.post('/mock-checkout', async (req, res) => {
    const s = mockState.sessions.get(String(req.query.session_id))
    if (!s) return res.status(404).send('Unknown test session')
    const card = new URLSearchParams(req.rawBody.toString('utf8')).get('card')?.replace(/\s/g, '')
    // Mirror Stripe's test cards: 4242… succeeds, 4000 0000 0000 0002 is declined.
    if (card !== '4242424242424242') {
      return res.status(402).type('html').send(page(s, card === '4000000000000002' ? 'Your card was declined.' : 'Use the test card 4242 4242 4242 4242.'))
    }
    s.payment_status = 'paid'
    s.status = 'complete'
    const payload = JSON.stringify({
      id: `evt_mock_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: s.id, object: 'checkout.session', payment_status: 'paid', amount_total: s.amount_total, metadata: s.metadata } },
    })
    const origin = `${req.protocol}://${req.headers.host}`
    const hook = await fetch(`${origin}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signTestPayload(payload, webhookSecret()) },
      body: payload,
    })
    if (!hook.ok) return res.status(500).type('html').send(page(s, `Webhook failed (${hook.status}).`))
    res.redirect(303, s.success_url.replace('{CHECKOUT_SESSION_ID}', s.id))
  })
}
