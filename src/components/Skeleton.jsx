// Loading placeholders in the glass style. Decorative only: the region that's loading carries
// aria-busy, and screen readers get a single "Loading…" announcement.

export function Bone({ className = '' }) {
  return <span aria-hidden className={`block animate-pulse rounded-xl bg-fg/[0.07] ${className}`} />
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="glass flex h-full flex-col rounded-3xl p-2.5">
      <Bone className="aspect-[4/3] rounded-2xl" />
      <div className="space-y-2.5 px-2 pb-1 pt-3">
        <Bone className="h-4 w-3/4" />
        <Bone className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Bone className="h-6 w-16" />
          <Bone className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 8, className = '' }) {
  return (
    <div role="status" aria-label="Loading products" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function RowSkeleton({ rows = 3 }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} aria-hidden className="glass flex items-center gap-4 rounded-3xl p-3">
          <Bone className="h-20 w-20 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-1/2" />
            <Bone className="h-3 w-1/3" />
            <Bone className="h-9 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
