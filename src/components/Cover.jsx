import { BookOpen, Play, Aperture, Film, LayoutTemplate, GraduationCap, Shapes, Type } from 'lucide-react'

const CATEGORY_ICONS = { Templates: LayoutTemplate, 'E-books': BookOpen, Presets: Aperture, Courses: GraduationCap, Icons: Shapes, Fonts: Type }

// Generated cover art: gradient + category motif, so every product has a unique, crisp visual.
// `compact` swaps the detailed motif for a category icon, for thumbnails too small to show it.
export default function Cover({ product, variant = 0, compact = false, className = '' }) {
  const [a, b] = product.palette
  const angle = [135, 200, 60, 320][variant % 4]

  if (compact) {
    const Icon = CATEGORY_ICONS[product.category]
    return (
      <div className={`relative grid place-items-center overflow-hidden ${className}`} style={{ background: `linear-gradient(${angle}deg, ${a}, ${b})` }}>
        <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-white/25 blur-md" />
        <Icon className="relative h-1/2 w-1/2 max-h-8 max-w-8 text-white drop-shadow-md" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(${angle}deg, ${a}, ${b})` }}>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-black/20 blur-2xl" />
      <div
        className="absolute inset-0 opacity-[.15]"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
      />
      <div className="absolute inset-0 grid place-items-center p-6" style={{ transform: variant ? `scale(${1 + variant * 0.06})` : undefined }}>
        <Motif product={product} variant={variant} />
      </div>
    </div>
  )
}

const FONT_STYLES = {
  'bloom-script': { fontStyle: 'italic', fontFamily: 'Georgia, serif' },
  'pixel-mono': { fontFamily: 'ui-monospace, monospace' },
  'serif-display': { fontFamily: 'Georgia, serif' },
}

const SHAPE_RADII = ['50%', '20%', '50% 0', '0 50%', '50%', '30%', '0', '50%', '20% 50%']

function Motif({ product, variant }) {
  const [a, b] = product.palette
  const card = 'rounded-xl bg-white/90 shadow-2xl shadow-black/30'
  const tilt = variant % 2 ? 4 : -6

  switch (product.motif) {
    case 'book':
      return (
        <div
          className="relative aspect-[3/4] h-[72%] rounded-l-sm rounded-r-xl bg-white/95 p-3 shadow-2xl shadow-black/40"
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          <div className="absolute inset-y-0 left-0 w-2 rounded-l-sm" style={{ background: a }} />
          <BookOpen className="mb-2 h-5 w-5" style={{ color: a }} />
          <p className="font-display text-[13px] font-bold leading-tight text-zinc-900">{product.title}</p>
          <p className="mt-1 text-[9px] text-zinc-500">{product.creator}</p>
        </div>
      )
    case 'play':
      return (
        <div className={`${card} flex w-[78%] flex-col gap-2 p-3`}>
          <div className="relative grid aspect-video place-items-center rounded-lg" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/90">
              <Play className="h-5 w-5 fill-zinc-900 text-zinc-900" />
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-200">
            <div className="h-full w-2/3 rounded-full" style={{ background: a }} />
          </div>
        </div>
      )
    case 'aperture':
    case 'film': {
      const Icon = product.motif === 'film' ? Film : Aperture
      return (
        <div className="relative flex w-[80%] gap-2" style={{ transform: `rotate(${variant % 2 ? 3 : -3}deg)` }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 rounded-lg bg-white/90 p-1.5 shadow-xl shadow-black/30" style={{ transform: `translateY(${i === 1 ? -10 : 6}px)` }}>
              <div className="aspect-[3/4] rounded-md" style={{ background: `linear-gradient(${160 + i * 40}deg, ${product.palette[i % 2]}, #111)` }} />
            </div>
          ))}
          <Icon className="absolute -bottom-7 -right-2 h-10 w-10 text-white drop-shadow-lg" />
        </div>
      )
    }
    case 'type':
      return (
        <div className="text-center text-white drop-shadow-xl">
          <p className="font-display text-7xl font-extrabold leading-none" style={FONT_STYLES[product.id]}>
            {product.glyph}
          </p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.3em] opacity-80">Abcdefg 0123</p>
        </div>
      )
    case 'shapes':
    case 'icons': {
      const glossy = product.motif === 'shapes'
      return (
        <div className="grid w-[66%] grid-cols-3 gap-2">
          {SHAPE_RADII.map((radius, i) => (
            <div key={i} className={`grid aspect-square place-items-center rounded-xl ${glossy ? 'bg-white/25 backdrop-blur' : 'bg-white/90'}`}>
              <div
                className="h-1/2 w-1/2"
                style={{
                  borderRadius: radius,
                  background: glossy ? `radial-gradient(circle at 30% 30%, #fff, ${product.palette[i % 2]})` : 'transparent',
                  border: glossy ? 'none' : `2px solid ${product.palette[i % 2]}`,
                }}
              />
            </div>
          ))}
        </div>
      )
    }
    case 'bars':
      return (
        <div className={`${card} flex h-[58%] w-[76%] items-end gap-2 p-4`}>
          {[40, 65, 50, 85, 100].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: product.palette[i % 2] }} />
          ))}
        </div>
      )
    case 'stack':
      return (
        <div className="relative aspect-square h-[64%]">
          {[2, 1, 0].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-2xl bg-white/90 p-3 shadow-xl shadow-black/30"
              style={{ transform: `translate(${i * 14}px, ${i * -10}px) rotate(${i * 5}deg)`, opacity: 1 - i * 0.2 }}
            >
              {i === 0 && (
                <>
                  <div className="h-2 w-1/2 rounded-full" style={{ background: a }} />
                  <p className="mt-3 font-display text-sm font-bold leading-tight text-zinc-900">5 hooks that stop the scroll</p>
                </>
              )}
            </div>
          ))}
        </div>
      )
    default:
      return (
        <div className={`${card} w-[80%] overflow-hidden`}>
          <div className="flex gap-1 border-b border-zinc-200 px-3 py-2">
            {['#f87171', '#fbbf24', '#34d399'].map((c) => (
              <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-3">
            <div className="col-span-3 h-6 rounded-md" style={{ background: `linear-gradient(90deg, ${a}, ${b})` }} />
            {Array.from({ length: product.motif === 'grid' ? 6 : 3 }).map((_, i) => (
              <div key={i} className="h-7 rounded-md bg-zinc-100" />
            ))}
          </div>
        </div>
      )
  }
}
