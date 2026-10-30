import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, SearchX, SlidersHorizontal } from 'lucide-react'
import { Page, exit, spring } from '../components/Motion'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import { CATEGORIES } from '../data/products'
import { useApi } from '../lib/api'
import { useSeo } from '../lib/seo'
import { GridSkeleton } from '../components/Skeleton'
import LoadError from '../components/LoadError'

// Filtering, sorting and search all happen in the database (GET /api/products).
const SORTS = {
  popular: { label: 'Popular' },
  newest: { label: 'Newest' },
  'price-asc': { label: 'Price: low to high' },
  'price-desc': { label: 'Price: high to low' },
}

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || 'All'
  const sort = params.get('sort') || 'popular'
  // Search text lives in local state: routing updates run as transitions, so a URL-driven input drops fast keystrokes.
  const [query, setQuery] = useState('')
  // Wait for a short pause in typing before asking the server.
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])
  useSeo({
    title: category === 'All' ? 'Shop' : `${category} · Shop`,
    description: 'Browse templates, e-books, presets, courses, icons and fonts from independent creators. Instant download.',
  })

  const update = (key, value, fallback) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!value || value === fallback) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const clearFilters = () => {
    setQuery('')
    setParams({}, { replace: true })
  }

  const qs = new URLSearchParams({ sort: SORTS[sort] ? sort : 'popular' })
  if (category !== 'All') qs.set('category', category)
  if (debounced) qs.set('q', debounced)
  const { data, error, loading, reload } = useApi(`/api/products?${qs}`)
  const results = data?.products ?? []
  const shownQuery = debounced

  return (
    <Page className="section pt-10">
      <div className="text-center sm:text-left">
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          The <span className="text-gradient">Shop</span>
        </h1>
        <p className="mt-2 text-muted">Hand-picked digital products from independent creators.</p>
      </div>

      <div className="sticky top-[76px] z-30 -mx-4 mt-8 space-y-3 bg-bg/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-[84px] lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="glass flex flex-1 items-center gap-3 rounded-full px-4 py-3 focus-within:ring-4 focus-within:ring-violet-500/20">
            <Search className="h-5 w-5 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search templates, presets, fonts…"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
              aria-label="Search products"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="-m-2 grid h-10 w-10 place-items-center rounded-full">
                <X className="h-4 w-4 text-muted hover:text-fg" />
              </button>
            )}
          </label>
          <label className="glass flex items-center gap-2 rounded-full px-4 py-3">
            <SlidersHorizontal className="h-4 w-4 text-muted" />
            <select
              value={sort}
              onChange={(e) => update('sort', e.target.value, 'popular')}
              className="cursor-pointer bg-transparent text-base font-medium outline-none sm:text-sm"
              aria-label="Sort products"
            >
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k} className="bg-card text-fg">{s.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {['All', ...CATEGORIES].map((c) => {
            const active = c === category
            return (
              <button
                key={c}
                onClick={() => update('category', c, 'All')}
                className={`chip relative shrink-0 ${active ? 'text-white' : 'glass text-muted hover:text-fg'}`}
              >
                {active && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-hot-600 shadow-glow" />}
                <span className="relative">{c}</span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="mb-4 mt-4 text-sm text-muted" aria-live="polite">
        {data ? (
          <>
            {results.length} {results.length === 1 ? 'product' : 'products'}
            {shownQuery && <> for "<span className="text-fg">{shownQuery}</span>"</>}
          </>
        ) : error ? null : (
          'Loading products…'
        )}
      </p>

      {error && !data ? (
        <LoadError error={error} onRetry={reload} />
      ) : !data ? (
        <GridSkeleton count={8} className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matches, yet"
          text={shownQuery ? `We couldn't find anything for "${shownQuery}". Try a different word or browse all categories.` : "Nothing in this category yet. Try another one."}
          action="Clear filters"
          to="/shop"
          onAction={clearFilters}
        />
      ) : (
        <motion.div layout aria-busy={loading} className={`grid grid-cols-1 gap-4 transition-opacity min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            {results.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96, transition: exit }} transition={spring}>
                <ProductCard product={p} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Page>
  )
}
