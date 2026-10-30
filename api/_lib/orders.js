import { db } from './db.js'

export async function ownsProduct(userId, productId) {
  const [row] = await db()`
    select 1 as owned from order_items oi join orders o on o.id = oi.order_id
    where o.user_id = ${userId} and o.status = 'paid' and oi.product_id = ${productId} limit 1`
  return Boolean(row)
}

// PX- + 8 random characters (no look-alikes such as 0/O or 1/I). The database enforces uniqueness.
export function newOrderNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (const b of crypto.getRandomValues(new Uint8Array(8))) s += chars[b % chars.length]
  return `PX-${s}`
}

export async function orderWithItems(order) {
  const items = await db()`
    select oi.product_id, oi.price_cents, oi.quantity, p.slug, p.title, p.file_format, p.cover_style, c.name as category
    from order_items oi
    join products p on p.id = oi.product_id
    join categories c on c.id = p.category_id
    where oi.order_id = ${order.id}
    order by oi.id`
  return {
    number: order.order_number,
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    totalCents: order.total_cents,
    discountCode: order.discount_code,
    items: items.map((i) => ({
      productId: i.product_id,
      slug: i.slug,
      title: i.title,
      category: i.category,
      format: i.file_format,
      priceCents: i.price_cents,
      quantity: i.quantity,
      palette: i.cover_style?.palette,
      motif: i.cover_style?.motif,
      glyph: i.cover_style?.glyph,
    })),
  }
}
