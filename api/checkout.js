import { db } from './_lib/db.js'
import { route, body, badRequest, HttpError } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'
import { findDiscount } from './_lib/discounts.js'
import { newOrderNumber } from './_lib/orders.js'
import { stripe } from './_lib/stripe.js'
import { computeTotals } from '../src/lib/money.js'

const MAX_LINES = 30

// Public base URL for Stripe's redirect links. APP_URL wins when set (recommended in production).
function baseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0]
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`
}

// POST /api/checkout { items: [{ slug, quantity }], discountCode? }
// Prices ALWAYS come from the database; anything price-like sent by the browser is ignored.
export default route('POST', async (req, res) => {
  const user = await requireUser(req)
  const { items, discountCode } = body(req)

  if (!Array.isArray(items) || items.length === 0) throw badRequest('Your cart is empty. Add something you love first.')
  if (items.length > MAX_LINES) throw badRequest('That cart is too large. Please remove some items.')

  // Merge duplicate lines and validate quantities.
  const wanted = new Map()
  for (const line of items) {
    const slug = String(line?.slug ?? line?.id ?? '').trim()
    const qty = Number(line?.quantity ?? line?.qty ?? 1)
    if (!slug) throw badRequest('One of the items in your cart is invalid.')
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw badRequest('Quantities must be whole numbers from 1 to 10.')
    wanted.set(slug, Math.min(10, (wanted.get(slug) ?? 0) + qty))
  }

  const sql = db()
  const products = await sql`select id, slug, title, short_description, price_cents from products where slug = any(${[...wanted.keys()]})`
  if (products.length !== wanted.size) {
    const known = new Set(products.map((p) => p.slug))
    const missing = [...wanted.keys()].filter((s) => !known.has(s))
    throw badRequest(`Some items are no longer available: ${missing.join(', ')}. Please remove them from your cart.`)
  }

  const owned = await sql`
    select distinct p.title from order_items oi
    join orders o on o.id = oi.order_id and o.status = 'paid'
    join products p on p.id = oi.product_id
    where o.user_id = ${user.id} and oi.product_id = any(${products.map((p) => p.id)})`
  if (owned.length) {
    throw new HttpError(409, `You already own ${owned.map((o) => o.title).join(', ')}. Find it in My Library.`, { code: 'ALREADY_OWNED' })
  }

  let discount = null
  if (discountCode !== undefined && discountCode !== null && String(discountCode).trim() !== '') {
    discount = await findDiscount(discountCode)
    if (!discount) throw badRequest("That discount code isn't valid or has expired.", { field: 'discountCode' })
  }

  const lines = products.map((p) => ({ ...p, quantity: wanted.get(p.slug) }))
  const totals = computeTotals(
    lines.map((l) => ({ priceCents: l.price_cents, quantity: l.quantity })),
    discount?.percent_off ?? 0,
  )
  if (totals.total < 50) throw badRequest('Order total is too small to process.') // Stripe's minimum is $0.50

  // Create the order and its items in one statement, so it's all-or-nothing.
  const orderNumber = newOrderNumber()
  const itemsJson = JSON.stringify(lines.map((l) => ({ product_id: l.id, price_cents: l.price_cents, quantity: l.quantity })))
  const [order] = await sql`
    with o as (
      insert into orders (user_id, order_number, status, subtotal_cents, discount_cents, total_cents, discount_code)
      values (${user.id}, ${orderNumber}, 'pending', ${totals.subtotal}, ${totals.discount}, ${totals.total}, ${discount?.code ?? null})
      returning id, order_number
    ), i as (
      insert into order_items (order_id, product_id, price_cents, quantity)
      select o.id, x.product_id, x.price_cents, x.quantity
      from o, jsonb_to_recordset(${itemsJson}::jsonb) as x(product_id int, price_cents int, quantity int)
      returning id
    )
    select o.id, o.order_number, (select count(*)::int from i) as item_count from o`

  try {
    const s = stripe()
    // The discount is passed as an exact cent amount so Stripe's total matches ours to the cent.
    const coupon = totals.discount > 0
      ? await s.coupons.create({ amount_off: totals.discount, currency: 'usd', duration: 'once', max_redemptions: 1, name: discount.code })
      : null
    const base = baseUrl(req)
    const session = await s.checkout.sessions.create({
      mode: 'payment',
      currency: 'usd',
      customer_email: user.email,
      client_reference_id: order.order_number,
      metadata: { order_number: order.order_number, order_id: String(order.id) },
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: l.price_cents,
          product_data: { name: l.title, description: l.short_description, metadata: { slug: l.slug } },
        },
      })),
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
      success_url: `${base}/success/${order.order_number}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?canceled=1`,
    })
    await sql`update orders set stripe_session_id = ${session.id} where id = ${order.id}`
    res.status(201).json({ url: session.url, orderNumber: order.order_number, totals })
  } catch (err) {
    await sql`update orders set status = 'failed' where id = ${order.id} and status = 'pending'`
    throw err
  }
})
