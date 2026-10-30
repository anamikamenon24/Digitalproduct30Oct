import { db } from './_lib/db.js'
import { route, body, badRequest, notFound, HttpError } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'
import { ownsProduct } from './_lib/orders.js'

// POST /api/reviews { productSlug, rating, comment } — buyers only, one review each, rating 1-5.
export default route('POST', async (req, res) => {
  const user = await requireUser(req)
  const { productSlug, rating, comment } = body(req)
  const stars = Number(rating)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw badRequest('Choose a rating from 1 to 5 stars.', { field: 'rating' })
  const text = String(comment ?? '').trim()
  if (text.length > 1000) throw badRequest('Keep your review under 1000 characters.', { field: 'comment' })

  const [product] = await db()`select id from products where slug = ${String(productSlug ?? '')}`
  if (!product) throw notFound("We couldn't find that product.")
  if (!(await ownsProduct(user.id, product.id))) throw new HttpError(403, 'Only people who bought this product can review it.')

  const [review] = await db()`
    insert into reviews (product_id, user_id, reviewer_name, rating, comment)
    values (${product.id}, ${user.id}, ${user.full_name}, ${stars}, ${text})
    on conflict (product_id, user_id) do nothing
    returning id, rating, comment, created_at`
  if (!review) throw new HttpError(409, "You've already reviewed this product. Thank you!")

  res.status(201).json({ review: { ...review, name: user.full_name, mine: true } })
})
