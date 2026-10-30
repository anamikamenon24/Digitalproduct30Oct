import { route } from '../_lib/http.js'
import { requireUser, publicUser } from '../_lib/auth.js'

export default route('GET', async (req, res) => {
  const user = await requireUser(req)
  res.status(200).json({ user: publicUser(user) })
})
