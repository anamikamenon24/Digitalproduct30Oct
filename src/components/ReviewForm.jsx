import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Loader2, Send } from 'lucide-react'
import { api } from '../lib/api'

// Shown only to logged-in buyers who haven't reviewed this product yet.
export default function ReviewForm({ productSlug, onSaved }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return setError('Choose a rating from 1 to 5 stars.')
    setBusy(true)
    setError('')
    try {
      await api('/api/reviews', { method: 'POST', body: { productSlug, rating, comment } })
      setDone(true)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const shown = hover || rating
  if (done) return null
  return (
    <form onSubmit={submit} noValidate className="glass mt-6 rounded-3xl p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold">Leave a review</h3>
      <p className="text-sm text-muted">You own this product. How did you like it?</p>
      <fieldset className="mt-4">
        <legend className="mb-1.5 text-sm font-medium">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button
              key={n}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setRating(n)
                setError('')
              }}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
              className="grid h-11 w-11 place-items-center rounded-full"
            >
              <Star className={`h-7 w-7 transition-colors ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-muted/50'}`} />
            </motion.button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="review-comment" className="mb-1.5 mt-4 block text-sm font-medium">
        Your review <span className="font-normal text-muted">(optional)</span>
      </label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        className="input resize-y"
        placeholder="What did you make with it?"
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-hot-400">
          {error}
        </p>
      )}
      <motion.button whileTap={{ scale: 0.97 }} disabled={busy} aria-busy={busy} className="btn-primary mt-4">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {busy ? 'Posting…' : 'Post review'}
      </motion.button>
    </form>
  )
}
