import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { agent, signedUpAgent, cleanup, buy, productBySlug, getApp } from './helpers.js'

afterAll(cleanup)

let alice, bob, aliceOrder, pendingNumber, pixelMono, novaGrotesk

beforeAll(async () => {
  alice = await signedUpAgent('alice')
  bob = await signedUpAgent('bob')
  pixelMono = await productBySlug('pixel-mono')
  novaGrotesk = await productBySlug('nova-grotesk')
  aliceOrder = await buy(alice.agent, ['pixel-mono'])
  // A second order Alice never pays for.
  const pending = await alice.agent.post('/api/checkout').send({ items: [{ slug: 'nova-grotesk' }] })
  pendingNumber = pending.body.orderNumber
})

describe('My Library and downloads', () => {
  it('library lists only paid products', async () => {
    const res = await alice.agent.get('/api/library')
    expect(res.status).toBe(200)
    expect(res.body.items.map((i) => i.product.slug)).toEqual(['pixel-mono'])
    expect(res.body.items[0].orderNumber).toBe(aliceOrder.orderNumber)
  })

  it('the owner can download a paid product', async () => {
    const res = await alice.agent.get(`/api/download/${pixelMono.id}`).buffer(true)
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="pixel-mono-sample.txt"/)
    expect(res.body.toString()).toContain('Pixel Mono')
  })

  it('an unpaid (pending) product cannot be downloaded', async () => {
    expect((await alice.agent.get(`/api/download/${novaGrotesk.id}`)).status).toBe(403)
  })

  it('a logged-out visitor cannot download', async () => {
    expect((await request(await getApp()).get(`/api/download/${pixelMono.id}`)).status).toBe(401)
  })

  it('rejects invalid product ids', async () => {
    expect((await alice.agent.get('/api/download/abc')).status).toBe(400)
    expect((await alice.agent.get('/api/download/999999')).status).toBe(404)
    expect((await alice.agent.get('/api/download/..%2F.env')).status).toBe(400)
  })
})

describe('user A cannot see user B data', () => {
  it("Bob's library is empty and he cannot download Alice's purchase", async () => {
    expect((await bob.agent.get('/api/library')).body.items).toEqual([])
    expect((await bob.agent.get(`/api/download/${pixelMono.id}`)).status).toBe(403)
  })

  it("Bob's order list contains none of Alice's orders", async () => {
    const res = await bob.agent.get('/api/orders')
    expect(res.status).toBe(200)
    expect(res.body.orders).toEqual([])
  })

  it("Bob cannot open Alice's order by its number", async () => {
    expect((await bob.agent.get(`/api/orders/${aliceOrder.orderNumber}`)).status).toBe(404)
    expect((await bob.agent.get(`/api/orders/${pendingNumber}`)).status).toBe(404)
  })

  it('Alice sees exactly her own orders with correct totals and statuses', async () => {
    const res = await alice.agent.get('/api/orders')
    const byNumber = Object.fromEntries(res.body.orders.map((o) => [o.number, o]))
    expect(Object.keys(byNumber).sort()).toEqual([aliceOrder.orderNumber, pendingNumber].sort())
    expect(byNumber[aliceOrder.orderNumber]).toMatchObject({ status: 'paid', totalCents: 1500 })
    expect(byNumber[pendingNumber]).toMatchObject({ status: 'pending', totalCents: 4500 })
    expect(JSON.stringify(res.body)).not.toMatch(/user_id|password|stripe_session/)
  })
})

describe('protected routes need login', () => {
  it.each([
    ['get', '/api/auth/me'],
    ['get', '/api/library'],
    ['get', '/api/orders'],
    ['get', '/api/orders/PX-ANYTHING'],
    ['get', '/api/download/1'],
    ['post', '/api/checkout'],
    ['post', '/api/reviews'],
  ])('%s %s returns 401 when logged out', async (method, url) => {
    const res = await request(await getApp())[method](url).send({})
    expect(res.status).toBe(401)
  })
})

describe('POST /api/reviews', () => {
  it('a buyer can leave one review, which then shows on the product', async () => {
    const res = await alice.agent.post('/api/reviews').send({ productSlug: 'pixel-mono', rating: 5, comment: 'Lovely pixel font!' })
    expect(res.status).toBe(201)
    const page = await alice.agent.get('/api/products/pixel-mono')
    expect(page.body.reviews.find((r) => r.mine)).toMatchObject({ rating: 5, comment: 'Lovely pixel font!', name: 'Tester alice' })
    expect(page.body.viewer).toMatchObject({ owns: true, hasReviewed: true, canReview: false })
  })

  it('a second review of the same product is refused', async () => {
    const res = await alice.agent.post('/api/reviews').send({ productSlug: 'pixel-mono', rating: 4, comment: 'Again' })
    expect(res.status).toBe(409)
  })

  it('a non-buyer (or unpaid order) cannot review', async () => {
    expect((await bob.agent.post('/api/reviews').send({ productSlug: 'pixel-mono', rating: 5 })).status).toBe(403)
    expect((await alice.agent.post('/api/reviews').send({ productSlug: 'nova-grotesk', rating: 5 })).status).toBe(403)
  })

  it.each([0, 6, 3.5, -1, 'five', null])('rejects rating %s', async (rating) => {
    const { agent: c } = await signedUpAgent('rater')
    await buy(c, ['emoji-stickers'])
    const res = await c.post('/api/reviews').send({ productSlug: 'emoji-stickers', rating })
    expect(res.status).toBe(400)
    expect(res.body.field).toBe('rating')
  })

  it('404s for an unknown product', async () => {
    expect((await alice.agent.post('/api/reviews').send({ productSlug: 'nope', rating: 5 })).status).toBe(404)
  })
})

describe('private storage', () => {
  it('files in /storage are not reachable by URL on the API server', async () => {
    const app = await getApp()
    for (const url of ['/storage/pixel-mono-sample.txt', '/api/storage/pixel-mono-sample.txt', '/api/../storage/pixel-mono-sample.txt']) {
      const res = await request(app).get(url)
      expect([401, 404]).toContain(res.status)
      expect(res.text ?? '').not.toContain('Pixel Mono')
    }
  })
})

describe('newsletter', () => {
  it('saves an email once and reports duplicates without failing', async () => {
    const a = await agent()
    const email = `news-${Date.now()}@pixelora.test`
    expect((await a.post('/api/newsletter').send({ email })).status).toBe(201)
    const again = await a.post('/api/newsletter').send({ email: email.toUpperCase() })
    expect(again.status).toBe(200)
    expect(again.body.alreadySubscribed).toBe(true)
  })

  it.each(['', 'nope', 'a@b', '@example.com', 'x@y.'])('rejects invalid email "%s"', async (email) => {
    expect((await (await agent()).post('/api/newsletter').send({ email })).status).toBe(400)
  })
})

describe('discount preview', () => {
  it('accepts WELCOME10 and rejects wrong or inactive codes', async () => {
    const a = await agent()
    expect((await a.post('/api/discount').send({ code: 'welcome10' })).body).toEqual({ valid: true, code: 'WELCOME10', percentOff: 10 })
    for (const code of ['SUMMER25', 'nope', '']) {
      const res = await a.post('/api/discount').send({ code })
      expect(res.status).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.error).toMatch(/isn't valid/)
    }
  })
})
