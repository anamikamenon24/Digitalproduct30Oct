import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="px-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M32 6c2.4 14 9.6 21.6 24 26-14.4 4.4-21.6 12-24 26-2.4-14-9.6-21.6-24-26 14.4-4.4 21.6-12 24-26z" fill="url(#px-g)" />
      <rect x="48" y="6" width="8" height="8" rx="2" fill="#ec4899" />
      <rect x="8" y="50" width="7" height="7" rx="2" fill="#8b5cf6" />
    </svg>
  )
}

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2 ${className}`} aria-label="Pixelora home">
      <LogoMark className="h-8 w-8 transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-110" />
      <span className="text-gradient font-display text-2xl font-extrabold tracking-tight">Pixelora</span>
    </Link>
  )
}
