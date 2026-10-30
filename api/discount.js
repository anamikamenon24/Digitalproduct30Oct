import { route, body } from './_lib/http.js'
import { findDiscount } from './_lib/discounts.js'

// POST /api/discount { code } — lets the cart preview a code. Checkout re-checks it on the server.
// A wrong code is a normal answer ("not valid"), not a server error, so it returns 200 with
// valid: false (browsers log every 4xx response in the console).
export default route('POST', async (req, res) => {
  const found = await findDiscount(body(req).code)
  if (!found) return res.status(200).json({ valid: false, error: "That code isn't valid or has expired. Try WELCOME10." })
  res.status(200).json({ valid: true, code: found.code, percentOff: found.percent_off })
})
