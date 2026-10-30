import { describe, it, expect, afterAll } from 'vitest'
import { agent, signedUpAgent, cleanup, sendWebhook, paidEvent, buy } from './helpers.js'
import { mockState } from '../../api/_lib/stripe.js'
import { db } from '../../api/_lib/db.js'

afterAll(cleanup)

const sessionIdOf = (res) => new URL(res.body.url).searchParams.get('session_id')
const orderRow = async (number) => (await db()`select * from orders where order_number = ${number}`)[0]

describe('POST /api/checkout', () => {
  it('requires login', async () => {
    const res = await (await agent()).post('/api/checkout').send({ items: [{ slug: 'pixel-mono', quantity: 1 }] })
    expect(res.status).toBe(401)
  })

  it('uses database prices even when the browser sends fake prices', async () => {
    const { agent: a } = await signedUpAgent('fakeprice')
    const res = await a.post('/api/checkout').send({
      items: [
        { slug: 'pixel-mono', quantity: 1, price: 0.01, priceCents: 1, price_cents: 1 },
        { slug: 'nova-grotesk', quantity: 1, price: 0.01, priceCents: 1 },
      ],
      total: 2,
      totalCents: 2,
    })
    expect(res.status).toBe(201)
    expect(res.body.totals).toEqual({ subtotal: 1500 + 4500, discount: 0, total: 6000 })

    const session = mockState.sessions.get(sessionIdOf(res))
    expect(session.params.line_items.map((l) => l.price_data.unit_amount).sort()).toEqual([1500, 4500])
    expect(session.params.metadata.order_number).toBe(res.body.orderNumber)
    expect(session.params.success_url).toContain(`/success/${res.body.orderNumber}`)

    const order = await orderRow(res.body.orderNumber)
    expect(order).toMatchObject({ status: 'pending', subtotal_cents: 6000, total_cents: 6000, stripe_session_id: session.id })
  })

  it('applies WELCOME10 on the server (case-insensitive) and passes the exact discount to Stripe', async () => {
    const { agent: a } = await signedUpAgent('welcome')
    const res = await a.post('/api/checkout').send({ items: [{ slug: 'pixel-mono' }, { slug: 'golden-hour-presets' }], discountCode: ' welcome10 ' })
    expect(res.status).toBe(201)
    // $15 + $18 = $33.00; 10% = $3.30
    expect(res.body.totals).toEqual({ subtotal: 3300, discount: 330, total: 2970 })
    const session = mockState.sessions.get(sessionIdOf(res))
    expect(session.amount_total).toBe(2970)
    expect(mockState.coupons.at(-1)).toMatchObject({ amount_off: 330, currency: 'usd', duration: 'once' })
    expect((await orderRow(res.body.orderNumber)).discount_code).toBe('WELCOME10')
  })

  it.each([
    ['a wrong code', 'FREESTUFF'],
    ['an inactive code', 'SUMMER25'],
  ])('rejects %s', async (_label, discountCode) => {
    const { agent: a } = await signedUpAgent('badcode')
    const res = await a.post('/api/checkout').send({ items: [{ slug: 'pixel-mono' }], discountCode })
    expect(res.status).toBe(400)
    expect(res.body.field).toBe('discountCode')
  })

  it('rejects an empty or malformed cart', async () => {
    const { agent: a } = await signedUpAgent('empty')
    expect((await a.post('/api/checkout').send({ items: [] })).status).toBe(400)
    expect((await a.post('/api/checkout').send({})).status).toBe(400)
    expect((await a.post('/api/checkout').send({ items: [{ slug: 'nope-not-real' }] })).status).toBe(400)
    expect((await a.post('/api/checkout').send({ items: [{ slug: 'pixel-mono', quantity: 0 }] })).status).toBe(400)
    expect((await a.post('/api/checkout').send({ items: [{ slug: 'pixel-mono', quantity: 1.5 }] })).status).toBe(400)
    expect((await a.post('/api/checkout').send({ items: [{ slug: 'pixel-mono', quantity: -3 }] })).status).toBe(400)
  })

  it('merges duplicate cart lines and keeps quantities', async () => {
    const { agent: a } = await signedUpAgent('dupes')
    const res = await a.post('/api/checkout').send({ items: [{ slug: 'pixel-mono', quantity: 1 }, { slug: 'pixel-mono', quantity: 2 }] })
    expect(res.status).toBe(201)
    expect(res.body.totals.subtotal).toBe(1500 * 3)
  })

  it('refuses to sell a product the user already owns', async () => {
    const { agent: a } = await signedUpAgent('owner')
    await buy(a, ['bloom-script'])
    const res = await a.post('/api/checkout').send({ items: [{ slug: 'bloom-script' }] })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('ALREADY_OWNED')
  })
})

describe('POST /api/webhooks/stripe', () => {
  async function pendingOrder(label) {
    const { agent: a } = await signedUpAgent(label)
    const res = await a.post('/api/checkout').send({ items: [{ slug: 'serif-display' }] })
    return { a, number: res.body.orderNumber, sessionId: sessionIdOf(res) }
  }

  it('marks the order paid when the signature is valid', async () => {
    const { number, sessionId } = await pendingOrder('hookok')
    const res = await sendWebhook(paidEvent(sessionId))
    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(1)
    const order = await orderRow(number)
    expect(order.status).toBe('paid')
    expect(order.paid_at).not.toBeNull()
  })

  it('rejects a missing signature', async () => {
    const { number, sessionId } = await pendingOrder('nosig')
    expect((await sendWebhook(paidEvent(sessionId), { signature: null })).status).toBe(400)
    expect((await orderRow(number)).status).toBe('pending')
  })

  it('rejects a fake signature and one signed with the wrong secret', async () => {
    const { number, sessionId } = await pendingOrder('fakesig')
    expect((await sendWebhook(paidEvent(sessionId), { signature: 't=123,v1=deadbeef' })).status).toBe(400)
    expect((await sendWebhook(paidEvent(sessionId), { secret: 'whsec_attacker' })).status).toBe(400)
    expect((await orderRow(number)).status).toBe('pending')
  })

  it('is idempotent: the same event twice changes nothing the second time', async () => {
    const { number, sessionId } = await pendingOrder('twice')
    const event = paidEvent(sessionId, { id: 'evt_same' })
    expect((await sendWebhook(event)).body.updated).toBe(1)
    const first = await orderRow(number)
    expect((await sendWebhook(event)).body.updated).toBe(0)
    const second = await orderRow(number)
    expect(second.paid_at).toEqual(first.paid_at)
    const [{ count }] = await db()`select count(*)::int as count from orders where stripe_session_id = ${sessionId}`
    expect(count).toBe(1)
    const [{ items }] = await db()`select count(*)::int as items from order_items where order_id = ${first.id}`
    expect(items).toBe(1)
  })

  it('does not mark paid when the amount paid does not match the order', async () => {
    const { number, sessionId } = await pendingOrder('mismatch')
    await sendWebhook(paidEvent(sessionId, { amountTotal: 1 }))
    expect((await orderRow(number)).status).toBe('failed')
  })

  it('marks an expired checkout as failed', async () => {
    const { number, sessionId } = await pendingOrder('expired')
    await sendWebhook({ id: 'evt_exp', type: 'checkout.session.expired', data: { object: { id: sessionId, payment_status: 'unpaid' } } })
    expect((await orderRow(number)).status).toBe('failed')
  })

  it('landing on the success page (reading the order) never marks it paid', async () => {
    const { a, number } = await pendingOrder('landing')
    const res = await a.get(`/api/orders/${number}`)
    expect(res.status).toBe(200)
    expect(res.body.order.status).toBe('pending')
    expect((await orderRow(number)).status).toBe('pending')
  })
})
