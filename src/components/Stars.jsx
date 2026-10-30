import { Star } from 'lucide-react'

export default function Stars({ rating, size = 'h-4 w-4', showValue = false }) {
  return (
    <span role="img" className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)))
        return (
          <span key={i} className={`relative inline-block ${size}`}>
            <Star className={`absolute inset-0 ${size} text-muted/40`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${size} fill-amber-400 text-amber-400`} />
            </span>
          </span>
        )
      })}
      {showValue && <span className="ml-1.5 text-sm font-semibold">{rating.toFixed(1)}</span>}
    </span>
  )
}
