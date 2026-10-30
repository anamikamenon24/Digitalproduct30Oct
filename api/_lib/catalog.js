import { db } from './db.js'

export const CATEGORY_SLUGS = { templates: 'Templates', 'e-books': 'E-books', presets: 'Presets', courses: 'Courses', icons: 'Icons', fonts: 'Fonts' }

// Columns + live stats shared by every product query. "sold" counts paid copies only.
export const PRODUCT_SELECT = `
  p.id, p.slug, p.title, p.short_description, p.description, p.price_cents, p.cover_url,
  p.file_format, p.file_size_mb::float8 as file_size_mb, p.is_featured, p.created_at,
  p.creator, p.includes, p.cover_style, c.name as category, c.slug as category_slug,
  coalesce(r.review_count, 0)::int as review_count,
  coalesce(r.avg_rating, 0)::float8 as avg_rating,
  coalesce(s.sold, 0)::int as sold`

export const PRODUCT_FROM = `
  from products p
  join categories c on c.id = p.category_id
  left join (select product_id, count(*) as review_count, round(avg(rating)::numeric, 1) as avg_rating
             from reviews group by product_id) r on r.product_id = p.id
  left join (select oi.product_id, sum(oi.quantity) as sold
             from order_items oi join orders o on o.id = oi.order_id and o.status = 'paid'
             group by oi.product_id) s on s.product_id = p.id`

const formatSize = (mb) => (mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10} GB` : `${Math.round(mb * 10) / 10} MB`)

// Shape a database row into what the existing UI components expect.
export function toProduct(row) {
  const style = row.cover_style ?? {}
  return {
    id: row.slug,
    productId: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    categorySlug: row.category_slug,
    priceCents: row.price_cents,
    price: row.price_cents / 100,
    rating: row.avg_rating,
    reviews: row.review_count,
    sales: row.sold,
    date: new Date(row.created_at).toISOString().slice(0, 10),
    creator: row.creator,
    tagline: row.short_description,
    description: row.description,
    includes: row.includes ?? [],
    format: row.file_format,
    size: formatSize(row.file_size_mb),
    featured: row.is_featured,
    coverUrl: row.cover_url,
    palette: style.palette ?? ['#7c3aed', '#ec4899'],
    motif: style.motif ?? 'grid',
    glyph: style.glyph,
  }
}

export async function findProductBySlug(slug) {
  const rows = await db().query(`select ${PRODUCT_SELECT} ${PRODUCT_FROM} where p.slug = $1`, [String(slug)])
  return rows[0] ? toProduct(rows[0]) : null
}
