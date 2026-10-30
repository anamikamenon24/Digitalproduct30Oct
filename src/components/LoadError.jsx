import { WifiOff, RotateCw } from 'lucide-react'

// Friendly message when data can't be loaded (database or server unreachable), with a retry button.
export default function LoadError({ error, onRetry, className = '' }) {
  return (
    <div role="alert" className={`glass col-span-full flex w-full flex-col items-center rounded-3xl px-6 py-10 text-center ${className}`}>
      <WifiOff aria-hidden className="h-8 w-8 text-hot-400" />
      <p className="mt-3 font-display font-semibold">We couldn't load this right now</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{error?.message || 'Please check your connection and try again.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-5">
          <RotateCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  )
}
