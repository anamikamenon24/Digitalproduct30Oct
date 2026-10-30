import { db } from './_lib/db.js'
import { route } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'
import { PRODUCT_SELECT, PRODUCT_FROM, toProduct } from './_lib/catalog.js'

// GET /api/library — products the logged-in user has PAID for (pending/failed orders don't count).
export default route('GET', async (req, res) => {
  const user = await requireUser(req)
  const rows = await db().query(
    `select x.*, owned.purchased_at, owned.order_number from (select ${PRODUCT_SELECT} ${PRODUCT_FROM}) x
     join (
       select distinct on (oi.product_id) oi.product_id, o.paid_at as purchased_at, o.order_number
       from order_items oi join orders o on o.id = oi.order_id
       where o.user_id = $1 and o.status = 'paid'
       order by oi.product_id, o.paid_at asc
     ) owned on owned.product_id = x.id
     order by owned.purchased_at desc, x.id`,
    [user.id],
  )
  res.status(200).json({
    items: rows.map((r) => ({ product: toProduct(r), purchasedAt: r.purchased_at, orderNumber: r.order_number })),
  })
})
