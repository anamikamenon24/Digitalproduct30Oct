import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Zap, Check, FileText, HardDrive, Download, ShieldCheck, ArrowLeft, PackageSearch, CreditCard } from 'lucide-react'
import { Page, Reveal } from '../components/Motion'
import Cover from '../components/Cover'
import Stars from '../components/Stars'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useApi, api } from '../lib/api'
import { formatCents } from '../lib/money'
import { useSeo } from '../lib/seo'
import { Bone } from '../components/Skeleton'
import LoadError from '../components/LoadError'
import ReviewForm from '../components/ReviewForm'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart, owns, items } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [active, setActive] = useState(0)
  // Re-fetch when the login state changes, so "owned" and "can review" are always current.
  const { data, error, loading, reload } = useApi(`/api/products/${encodeURIComponent(id)}?u=${user?.id ?? 0}`)
  const product = data?.product
  useSeo({
    title: product?.title ?? (error?.status === 404 ? 'Product not found' : 'Product'),
    description: product ? `${product.tagline} ${formatCents(product.priceCents)} · ${product.format}. Instant download from Pixelora.` : undefined,
    type: product ? 'product' : 'website',
  })

  if (error?.status === 404) {
    return (
      <Page className="section pt-10">
        <EmptyState icon={PackageSearch} title="Product not found" text="This product may have been removed or the link is broken." action="Back to the shop" />
      </Page>
    )
  }
  if (error && !data) {
    return (
      <Page className="section pt-10">
        <LoadError error={error} onRetry={reload} />
      </Page>
    )
  }
  if (!product || (loading && product.slug !== id)) return <DetailSkeleton />

  const owned = data.viewer.owns || owns(product.id)
  const related = data.related
  const reviews = data.reviews

  const add = () => {
    addToCart(product.id)
    toast(`${product.title} added to cart`)
  }
  const buyNow = () => {
    if (!items.some((i) => i.id === product.id)) addToCart(product.id)
    navigate('/checkout')
  }

  // A render function, not a nested component, so the buttons aren't remounted on every render.
  const renderActions = (compact) => {
    const size = compact ? 'flex-1 whitespace-nowrap px-3' : 'flex-1 py-4 text-base'
    const icon = compact ? 'hidden h-4 w-4 min-[400px]:block' : 'h-5 w-5'
    return owned ? (
      <a href={`/api/download/${product.productId}`} download className={`btn-primary ${compact ? 'flex-1' : 'w-full py-4 text-base'}`}>
        <Download className="h-5 w-5" /> Download
      </a>
    ) : (
      <>
        <motion.button whileTap={{ scale: 0.96 }} onClick={add} className={`btn-ghost ${size}`}>
          <ShoppingBag className={icon} /> Add to cart
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={buyNow} className={`btn-primary ${size}`}>
          <Zap className={icon} /> Buy now
        </motion.button>
      </>
    )
  }

  return (
    <Page className="section pb-20 pt-8 md:pb-0">
      <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* Gallery */}
        <div>
          <div className="glass overflow-hidden rounded-[2rem] p-2.5">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                <Cover product={product} variant={active} className="aspect-[4/3] rounded-[1.5rem]" />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((v) => (
              <button
                key={v}
                onClick={() => setActive(v)}
                className={`overflow-hidden rounded-2xl p-1 transition ${active === v ? 'ring-2 ring-violet-500 shadow-glow' : 'glass opacity-70 hover:opacity-100'}`}
                aria-label={`View image ${v + 1}`}
                aria-pressed={active === v}
              >
                <Cover product={product} variant={v} className="aspect-square rounded-xl" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-400">{product.category}</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">{product.title}</h1>
          <p className="mt-2 text-muted">
            by <span className="font-semibold text-fg">{product.creator}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Stars rating={product.rating} showValue />
            <span className="text-muted">{product.reviews} reviews</span>
            <span className="text-muted">·</span>
            <span className="text-muted">{product.sales.toLocaleString()} sold</span>
          </div>

          <p className="mt-6 font-display text-4xl font-extrabold">{formatCents(product.priceCents)}</p>
          <p className="mt-4 leading-relaxed text-muted">{product.description}</p>

          <div className="mt-6 hidden gap-3 md:flex">
            {renderActions(false)}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Download className="h-4 w-4 text-violet-400" /> Instant download</span>
            <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-violet-400" /> Secure payment</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-violet-400" /> 14-day refund</span>
          </div>

          <div className="glass mt-8 rounded-3xl p-5">
            <h2 className="font-semibold">What's included</h2>
            <ul className="mt-3 space-y-2.5">
              {product.includes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-hot-500">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t hairline pt-5 text-sm">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-violet-400" />
                <div>
                  <p className="text-xs text-muted">File format</p>
                  <p className="font-semibold">{product.format}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-violet-400" />
                <div>
                  <p className="text-xs text-muted">File size</p>
                  <p className="font-semibold">{product.size}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-20">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">What buyers say</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-display text-4xl font-extrabold">{data.averageRating.toFixed(1)}</span>
              <div>
                <Stars rating={data.averageRating} />
                <p className="text-xs text-muted">
                  Based on {data.reviewCount} {data.reviewCount === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
        {data.viewer.canReview && (
          <ReviewForm
            productSlug={product.slug}
            onSaved={() => {
              toast('Thanks! Your review is live.')
              reload()
            }}
          />
        )}
        {!data.viewer.loggedIn && (
          <p className="mt-4 text-sm text-muted">
            Bought this?{' '}
            <Link to={`/login?next=${encodeURIComponent(`/product/${product.slug}`)}`} className="font-semibold text-violet-400 underline-offset-4 hover:underline">
              Log in
            </Link>{' '}
            to leave a review.
          </p>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {reviews.map((r, i) => (
            <Reveal key={r.id} delay={Math.min(i, 5) * 0.05}>
              <div className="glass h-full rounded-3xl p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-hot-500 text-sm font-bold text-white">
                    {r.name[0]}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {r.name}
                      {r.mine && <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300">You</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Verified buyer
                    </p>
                  </div>
                  <Stars rating={r.rating} size="h-3.5 w-3.5" />
                </div>
                {r.comment && <p className="mt-3 text-base leading-relaxed text-muted sm:text-sm">{r.comment}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mt-20">
        <Reveal>
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl">You may also like</h2>
        </Reveal>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
          {related.map((p, i) => (
            <div key={p.id} className="w-[75%] shrink-0 snap-start sm:w-auto">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* Sticky mobile bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 30 }}
        className="fixed inset-x-0 bottom-[84px] z-30 px-3 md:hidden"
      >
        <div className="glass mx-auto flex max-w-md items-center gap-3 rounded-3xl p-2.5 pl-4 shadow-2xl shadow-black/40">
          <div className="shrink-0">
            <p className="text-xs text-muted">Price</p>
            <p className="font-display text-lg font-bold leading-none">{formatCents(product.priceCents)}</p>
          </div>
          <div className="flex flex-1 gap-2">
            {renderActions(true)}
          </div>
        </div>
      </motion.div>
    </Page>
  )
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading product" className="section pt-8">
      <Bone className="h-5 w-28" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div>
          <div className="glass rounded-[2rem] p-2.5">
            <Bone className="aspect-[4/3] rounded-[1.5rem]" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Bone key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Bone className="h-6 w-24 rounded-full" />
          <Bone className="h-10 w-4/5" />
          <Bone className="h-4 w-1/3" />
          <Bone className="h-10 w-28" />
          <Bone className="h-24 w-full" />
          <div className="flex gap-3">
            <Bone className="h-14 flex-1 rounded-full" />
            <Bone className="h-14 flex-1 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
