import { db } from '../_lib/db.js'
import { route, notFound } from '../_lib/http.js'
import { currentUser } from '../_lib/auth.js'
import { PRODUCT_SELECT, PRODUCT_FROM, findProductBySlug, toProduct } from '../_lib/catalog.js'
import { ownsProduct } from '../_lib/orders.js'

// GET /api/products/:slug — the product, its reviews, average rating, related products and,
// when logged in, whether the viewer owns it and may leave a review.
export default route('GET', async (req, res) => {
  const product = await findProductBySlug(req.query.slug)
  if (!product) throw notFound("We couldn't find that product. It may have been removed.")

  const sql = db()
  const reviews = await sql`
    select r.id, coalesce(u.full_name, r.reviewer_name) as name, r.rating, r.comment, r.created_at, r.user_id
    from reviews r left join users u on u.id = r.user_id
    where r.product_id = ${product.productId}
    order by r.created_at desc, r.id desc`

  const related = await sql.query(
    `select * from (select ${PRODUCT_SELECT} ${PRODUCT_FROM} where p.id <> $1) x
     order by (category = $2) desc, sold desc, review_count desc, id limit 4`,
    [product.productId, product.category],
  )

  const user = await currentUser(req)
  const owns = user ? await ownsProduct(user.id, product.productId) : false
  const hasReviewed = user ? reviews.some((r) => r.user_id === user.id) : false

  res.status(200).json({
    product,
    // Never expose other users' ids; just flag the viewer's own review.
    reviews: reviews.map(({ user_id, ...r }) => ({ ...r, mine: Boolean(user && user_id === user.id) })),
    averageRating: product.rating,
    reviewCount: product.reviews,
    related: related.map(toProduct),
    viewer: { loggedIn: Boolean(user), owns, hasReviewed, canReview: owns && !hasReviewed },
  })
})
