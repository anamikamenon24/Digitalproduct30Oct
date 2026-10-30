import { db } from '../_lib/db.js'
import { route, notFound } from '../_lib/http.js'
import { requireUser } from '../_lib/auth.js'
import { orderWithItems } from '../_lib/orders.js'

// GET /api/orders/:number — one order, only if it belongs to the logged-in user.
// The success page polls this; it never changes the order's status.
export default route('GET', async (req, res) => {
  const user = await requireUser(req)
  const [order] = await db()`select * from orders where order_number = ${String(req.query.number)} and user_id = ${user.id}`
  if (!order) throw notFound("We couldn't find that order.")
  res.status(200).json({ order: await orderWithItems(order) })
})
