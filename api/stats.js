import { db } from './_lib/db.js'
import { route } from './_lib/http.js'

// GET /api/stats — real counts for the Home page counters.
export default route('GET', async (_req, res) => {
  const [s] = await db()`
    select
      (select count(distinct user_id)::int from orders where status = 'paid') as customers,
      (select coalesce(sum(oi.quantity), 0)::int
         from order_items oi join orders o on o.id = oi.order_id where o.status = 'paid') as products_sold,
      (select count(*)::int from reviews where rating = 5) as five_star_reviews,
      (select count(*)::int from reviews) as reviews,
      (select count(*)::int from products) as products`
  res.status(200).json({
    customers: s.customers,
    productsSold: s.products_sold,
    fiveStarReviews: s.five_star_reviews,
    reviews: s.reviews,
    products: s.products,
  })
})
