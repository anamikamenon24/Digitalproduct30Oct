import { describe, it, expect } from 'vitest'
import { agent } from './helpers.js'

const CATEGORIES = ['Templates', 'E-books', 'Presets', 'Courses', 'Icons', 'Fonts']
const get = async (url) => (await agent()).get(url)

describe('GET /api/stats', () => {
  it('returns customers, products sold and reviews as whole numbers', async () => {
    const res = await get('/api/stats')
    expect(res.status).toBe(200)
    for (const key of ['customers', 'productsSold', 'fiveStarReviews', 'reviews', 'products']) {
      expect(Number.isInteger(res.body[key]), key).toBe(true)
      expect(res.body[key]).toBeGreaterThanOrEqual(0)
    }
    expect(res.body.products).toBe(24)
    expect(res.body.reviews).toBeGreaterThanOrEqual(72) // 3-5 per product
  })
})

describe('GET /api/products', () => {
  it('returns all 24 products with prices between $9 and $79', async () => {
    const { body } = await get('/api/products')
    expect(body.products).toHaveLength(24)
    for (const p of body.products) {
      expect(Number.isInteger(p.priceCents)).toBe(true)
      expect(p.priceCents).toBeGreaterThanOrEqual(900)
      expect(p.priceCents).toBeLessThanOrEqual(7900)
      expect(p.reviews).toBeGreaterThanOrEqual(3)
      expect(p.reviews).toBeLessThanOrEqual(5)
      expect(p.rating).toBeGreaterThan(0)
      expect(p).not.toHaveProperty('file_path')
      expect(JSON.stringify(p)).not.toMatch(/sample\.txt/)
    }
  })

  it.each(CATEGORIES)('filters by category %s (4 products)', async (category) => {
    const { body } = await get(`/api/products?category=${encodeURIComponent(category)}`)
    expect(body.products).toHaveLength(4)
    expect(body.products.every((p) => p.category === category)).toBe(true)
  })

  it('accepts category slugs too and rejects unknown categories', async () => {
    expect((await get('/api/products?category=e-books')).body.products).toHaveLength(4)
    expect((await get('/api/products?category=Nope')).status).toBe(400)
  })

  it('sorts by price low-high and high-low', async () => {
    const asc = (await get('/api/products?sort=price-asc')).body.products.map((p) => p.priceCents)
    const desc = (await get('/api/products?sort=price-desc')).body.products.map((p) => p.priceCents)
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
  })

  it('sorts by newest first', async () => {
    const dates = (await get('/api/products?sort=newest')).body.products.map((p) => p.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('sorts by popular (most sold, then most reviewed)', async () => {
    const list = (await get('/api/products?sort=popular')).body.products
    for (let i = 1; i < list.length; i++) {
      const [a, b] = [list[i - 1], list[i]]
      expect(a.sales > b.sales || (a.sales === b.sales && a.reviews >= b.reviews)).toBe(true)
    }
  })

  it('rejects an unknown sort', async () => {
    expect((await get('/api/products?sort=random')).status).toBe(400)
  })

  it('searches titles, descriptions, creators and categories (case-insensitive)', async () => {
    const titles = (q) => get(`/api/products?q=${encodeURIComponent(q)}`).then((r) => r.body.products.map((p) => p.title))
    expect(await titles('NOTION')).toEqual(['Creator OS for Notion'])
    expect((await titles('preset')).length).toBeGreaterThanOrEqual(3)
    expect(await titles('Typeforge')).toHaveLength(3)
    expect(await titles('zzzqqq')).toEqual([])
  })

  it('treats SQL wildcards and quotes in search as plain text', async () => {
    expect((await get('/api/products?q=%25')).body.products).toEqual([])
    expect((await get(`/api/products?q=${encodeURIComponent("' or 1=1 --")}`)).body.products).toEqual([])
  })

  it('combines category, search and sort', async () => {
    const { body } = await get('/api/products?category=Fonts&q=script&sort=price-asc')
    expect(body.products.map((p) => p.title)).toEqual(['Bloom Script'])
  })

  it('returns only featured products with featured=true', async () => {
    const { body } = await get('/api/products?featured=true')
    expect(body.products.length).toBeGreaterThan(0)
    expect(body.products.every((p) => p.featured)).toBe(true)
  })
})

describe('GET /api/products/:slug', () => {
  it('returns the product, its reviews, average rating and 4 related products', async () => {
    const res = await get('/api/products/nova-grotesk')
    expect(res.status).toBe(200)
    expect(res.body.product).toMatchObject({ slug: 'nova-grotesk', title: 'Nova Grotesk Font Family', category: 'Fonts', priceCents: 4500 })
    expect(res.body.reviews.length).toBe(res.body.reviewCount)
    const avg = res.body.reviews.reduce((s, r) => s + r.rating, 0) / res.body.reviews.length
    expect(res.body.averageRating).toBeCloseTo(Math.round(avg * 10) / 10, 5)
    expect(res.body.related).toHaveLength(4)
    expect(res.body.related.some((p) => p.slug === 'nova-grotesk')).toBe(false)
    expect(res.body.related[0].category).toBe('Fonts')
    expect(res.body.viewer).toEqual({ loggedIn: false, owns: false, hasReviewed: false, canReview: false })
    expect(JSON.stringify(res.body.reviews)).not.toMatch(/user_id|email/)
  })

  it('returns 404 for a wrong slug', async () => {
    const res = await get('/api/products/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/couldn't find/i)
  })
})
