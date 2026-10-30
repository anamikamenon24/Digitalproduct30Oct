import { db } from '../_lib/db.js'
import { route, badRequest } from '../_lib/http.js'
import { PRODUCT_SELECT, PRODUCT_FROM, CATEGORY_SLUGS, toProduct } from '../_lib/catalog.js'

const SORTS = {
  popular: 'sold desc, review_count desc, avg_rating desc, id',
  newest: 'created_at desc, id desc',
  'price-asc': 'price_cents asc, id',
  'price-desc': 'price_cents desc, id',
}

// GET /api/products?category=Templates&sort=price-asc&q=notion&featured=true
export default route('GET', async (req, res) => {
  const { category, sort = 'popular', q, featured } = req.query
  if (!SORTS[sort]) throw badRequest(`Unknown sort "${sort}". Use one of: ${Object.keys(SORTS).join(', ')}.`)

  const where = []
  const params = []
  if (category && category !== 'All') {
    const wanted = String(category).toLowerCase()
    const name = CATEGORY_SLUGS[wanted] ?? Object.values(CATEGORY_SLUGS).find((n) => n.toLowerCase() === wanted)
    if (!name) throw badRequest(`Unknown category "${category}".`)
    params.push(name)
    where.push(`c.name = $${params.length}`)
  }
  if (featured === 'true') where.push('p.is_featured')
  const search = String(q ?? '').trim().slice(0, 100)
  if (search) {
    // Escape LIKE wildcards so "%" or "_" typed in a search are matched literally.
    params.push(`%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
    const n = params.length
    where.push(`(p.title ilike $${n} or p.short_description ilike $${n} or p.creator ilike $${n} or c.name ilike $${n})`)
  }

  const rows = await db().query(
    `select * from (select ${PRODUCT_SELECT} ${PRODUCT_FROM} ${where.length ? `where ${where.join(' and ')}` : ''}) x
     order by ${SORTS[sort]}`,
    params,
  )
  res.status(200).json({ products: rows.map(toProduct) })
})
