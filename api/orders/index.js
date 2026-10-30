import { db } from '../_lib/db.js'
import { route } from '../_lib/http.js'
import { requireUser } from '../_lib/auth.js'
import { orderWithItems } from '../_lib/orders.js'

// GET /api/orders — the logged-in user's own orders, newest first.
export default route('GET', async (req, res) => {
  const user = await requireUser(req)
  const orders = await db()`select * from orders where user_id = ${user.id} order by created_at desc, id desc`
  res.status(200).json({ orders: await Promise.all(orders.map(orderWithItems)) })
})
