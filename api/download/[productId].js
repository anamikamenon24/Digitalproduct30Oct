import { readFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { db } from '../_lib/db.js'
import { route, badRequest, notFound, HttpError } from '../_lib/http.js'
import { requireUser } from '../_lib/auth.js'
import { ownsProduct } from '../_lib/orders.js'

// Private files live in /storage (never in /public), so the only way to get one is through this route.
const STORAGE_DIR = resolve(process.cwd(), 'storage')

// GET /api/download/:productId — sends the file only if the logged-in user has paid for it.
export default route('GET', async (req, res) => {
  const user = await requireUser(req)
  const productId = Number(req.query.productId)
  if (!Number.isInteger(productId) || productId < 1) throw badRequest('Invalid product.')

  const [product] = await db()`select id, slug, file_path from products where id = ${productId}`
  if (!product) throw notFound("We couldn't find that product.")
  if (!(await ownsProduct(user.id, product.id))) throw new HttpError(403, "You haven't bought this product yet, so it can't be downloaded.")

  // Defence in depth: the resolved path must stay inside /storage.
  const filePath = resolve(join(STORAGE_DIR, product.file_path))
  if (!filePath.startsWith(STORAGE_DIR + sep)) throw notFound('File not found.')

  let data
  try {
    data = await readFile(filePath)
  } catch {
    throw notFound('This file is temporarily unavailable. Please contact support.')
  }
  const filename = product.file_path.split(/[\\/]/).pop()
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', String(data.length))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.status(200).end(data)
})
