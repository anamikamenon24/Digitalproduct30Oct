import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { ShoppingBag, Check, Download } from 'lucide-react'
import Cover from './Cover'
import Stars from './Stars'
import { duration, ease, stagger } from './Motion'
import { formatCents } from '../lib/money'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'

export default function ProductCard({ product, index = 0 }) {
  const { addToCart, items, owns } = useStore()
  const toast = useToast()
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 220, damping: 22 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 220, damping: 22 })
  const inCart = items.some((i) => i.id === product.id)
  const owned = owns(product.id)

  // Tilt follows a mouse only; touch and reduced-motion users get a static card.
  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || reduce) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  const add = (e) => {
    e.preventDefault()
    addToCart(product.id)
    toast(`${product.title} added to cart`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: duration.slow, delay: (index % 4) * stagger, ease }}
      style={{ perspective: 900 }}
    >
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        whileHover={{ y: -4 }}
        transition={{ duration: duration.base, ease }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="group glass relative flex h-full flex-col overflow-hidden rounded-3xl p-2.5 transition-shadow duration-200 hover:shadow-glow"
      >
        {/* The title link below is the card's single tab stop; this image link is for pointer users. */}
        <Link to={`/product/${product.id}`} className="block" tabIndex={-1} aria-hidden>
          <div className="relative overflow-hidden rounded-2xl">
            <Cover product={product} className="aspect-[4/3] transition-transform duration-500 ease-out group-hover:scale-105" />
            <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              {product.category}
            </span>
          </div>
        </Link>
        <div className="flex flex-1 flex-col gap-2 px-2 pb-1 pt-3" style={{ transform: 'translateZ(20px)' }}>
          <Link to={`/product/${product.id}`} className="font-display text-[15px] font-semibold leading-snug hover:text-violet-400">
            {product.title}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Stars rating={product.rating} size="h-3.5 w-3.5" />
            <span className="font-semibold text-fg">{product.rating}</span>
            <span>({product.reviews})</span>
          </div>
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="font-display text-lg font-bold tabular-nums">{formatCents(product.priceCents)}</span>
            {owned ? (
              <Link to="/library" className="chip inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400">
                <Download className="h-4 w-4" /> Owned
              </Link>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={add}
                className={`chip inline-flex items-center gap-1.5 ${inCart ? 'bg-violet-500/15 text-violet-400' : 'bg-gradient-to-r from-violet-600 to-hot-600 text-white shadow-glow'}`}
                aria-label={`${inCart ? 'Add more' : 'Add to cart'}: ${product.title}`}
              >
                {inCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                {inCart ? 'Add more' : 'Add to cart'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
