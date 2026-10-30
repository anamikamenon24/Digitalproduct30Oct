import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Library as LibraryIcon, Calendar } from 'lucide-react'
import { Page } from '../components/Motion'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import { RowSkeleton } from '../components/Skeleton'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'

export const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Library() {
  useSeo({ title: 'My Library', description: 'All your Pixelora purchases, ready to download.' })
  const { library, refreshLibrary } = useStore()
  // Always show fresh data when the page opens (e.g. right after a purchase).
  useEffect(() => {
    refreshLibrary()
  }, [refreshLibrary])
  const owned = library.items
  const firstLoad = library.loading && owned.length === 0

  return (
    <Page className="section pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">
        My <span className="text-gradient">Library</span>
      </h1>
      <p className="mt-2 text-muted">
        {owned.length ? `${owned.length} ${owned.length === 1 ? 'product' : 'products'}, yours forever.` : 'Everything you buy lands here, ready to download.'}
      </p>

      {library.error && owned.length === 0 ? (
        <LoadError error={library.error} onRetry={refreshLibrary} className="mt-8" />
      ) : firstLoad ? (
        <div className="mt-8">
          <RowSkeleton rows={3} />
        </div>
      ) : owned.length === 0 ? (
        <EmptyState icon={LibraryIcon} title="Your library is empty" text="Find something you love in the Shop! Everything you buy appears here with instant downloads, forever." action="Browse Products" />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {owned.map(({ product, purchasedAt, orderNumber }, i) => (
            <motion.div
              key={product.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              className="glass group flex gap-4 rounded-3xl p-3 transition hover:-translate-y-1 hover:shadow-glow"
            >
              <Link to={`/product/${product.slug}`} className="shrink-0" tabIndex={-1} aria-hidden>
                <Cover product={product} compact className="h-24 w-24 rounded-2xl" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/product/${product.slug}`} className="truncate font-display font-semibold hover:text-violet-400">
                  {product.title}
                </Link>
                <p className="text-xs text-muted">
                  {product.format} · {product.size}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <Calendar className="h-3 w-3" /> Purchased {formatDate(purchasedAt)} · {orderNumber}
                </p>
                {/* A plain link: the browser sends the login cookie and the server checks ownership. */}
                <a href={`/api/download/${product.productId}`} download className="btn-primary mt-auto self-start px-4 py-2 text-xs" aria-label={`Download ${product.title}`}>
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Page>
  )
}
