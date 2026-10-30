import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Download, Lock, Star, ShoppingBag, Zap, LayoutTemplate, BookOpen, Aperture, GraduationCap, Shapes, Type } from 'lucide-react'
import { Page, Reveal, Counter, ease, stagger, duration } from '../components/Motion'
import ProductCard from '../components/ProductCard'
import Cover from '../components/Cover'
import FAQ from '../components/FAQ'
import { CATEGORIES } from '../data/products'
import { useStore } from '../context/StoreContext'
import { useApi } from '../lib/api'
import { useSeo } from '../lib/seo'
import { GridSkeleton, Bone } from '../components/Skeleton'
import LoadError from '../components/LoadError'

const HERO_SLUGS = ['first-1000-fans', 'neon-nights-presets', 'nova-grotesk']

const BRANDS = ['Lumen', 'Northbound', 'Polyform', 'Typeforge', 'Sol Studio', 'Bitworks', 'Kova Labs', 'Halcyon', 'Mintleaf', 'Orbit&Co']
const CATEGORY_ICONS = { Templates: LayoutTemplate, 'E-books': BookOpen, Presets: Aperture, Courses: GraduationCap, Icons: Shapes, Fonts: Type }

export default function Home() {
  const { hash } = useLocation()
  useSeo({ description: 'Pixelora is where independent creators sell templates, e-books, presets and mini-courses. Buy in seconds, download instantly.' })
  const featured = useApi('/api/products?featured=true')

  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 300)
  }, [hash])

  return (
    <Page>
      <Hero />
      <Brands />
      <Stats />

      <section className="section mt-24">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-hot-400">Featured</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">This week's top drops</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-violet-400 hover:gap-2 sm:flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {featured.data ? (
            featured.data.products.map((p, i) => (
              <div key={p.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <ProductCard product={p} index={i} />
              </div>
            ))
          ) : featured.error ? (
            <LoadError error={featured.error} onRetry={featured.reload} />
          ) : (
            <GridSkeleton count={4} className="contents" />
          )}
        </div>
      </section>

      <Categories />
      <HowItWorks />

      <section id="faq" className="section mt-24 grid scroll-mt-24 gap-10 lg:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-hot-400">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Questions, answered.</h2>
          <p className="mt-4 max-w-sm text-muted">Everything you need to know about buying and downloading on Pixelora.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <FAQ />
        </Reveal>
      </section>

      <CTA />
    </Page>
  )
}

function Hero() {
  const { catalog } = useStore()
  const catalogCount = catalog.products.length
  return (
    <section className="section relative grid items-center gap-12 pt-12 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
      <div className="relative z-10 text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold lg:mx-0"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-hot-500">
            <Sparkles className="h-3 w-3 text-white" />
          </span>
          Pixelora · {catalogCount || 24} fresh drops this month
        </motion.div>

        <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold leading-[1.02]">
          {['Create faster.', 'Sell smarter.'].map((line, i) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 + i * 0.1, ease }}
              className={`block ${i === 1 ? 'text-gradient' : ''}`}
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: duration.slow }}
          className="mx-auto mt-6 max-w-lg text-base text-muted sm:text-lg lg:mx-0"
        >
          Pixelora is where independent creators sell templates, e-books, presets and mini-courses. Buy in seconds, download instantly, create something great today.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: duration.slow, ease }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
        >
          <Link to="/shop" className="btn-primary w-full px-7 py-4 text-base sm:w-auto">
            <ShoppingBag className="h-5 w-5" /> Browse Products
          </Link>
          <a href="#how" className="btn-ghost w-full px-7 py-4 text-base sm:w-auto">
            How it works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: duration.slow }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted lg:justify-start"
        >
          <span className="flex items-center gap-1.5"><Download className="h-4 w-4 text-violet-400" /> Instant download</span>
          <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-violet-400" /> Secure checkout</span>
          <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.8 average rating</span>
        </motion.div>
      </div>

      <HeroVisual />
    </section>
  )
}

function HeroVisual() {
  const { bySlug } = useStore()
  const heroStack = HERO_SLUGS.map((slug) => bySlug.get(slug))
  const positions = [
    'left-[0%] top-[4%] rotate-[-8deg] w-[50%]',
    'right-[0%] top-[0%] rotate-[6deg] w-[48%]',
    'left-[24%] bottom-[-2%] rotate-[-2deg] w-[48%]',
  ]
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <div className="absolute inset-[12%] rounded-full bg-gradient-to-br from-violet-600 to-hot-500 opacity-40 blur-[80px]" />
      {heroStack.map((p, i) => !p ? (
        <Bone key={HERO_SLUGS[i]} className={`absolute aspect-[4/3] rounded-3xl ${positions[i]}`} />
      ) : (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease }}
          className={`absolute ${positions[i]}`}
        >
          <Link
            to={`/product/${p.id}`}
            className="glass block animate-float rounded-3xl p-2 shadow-2xl shadow-violet-900/30 transition-transform duration-300 hover:scale-105"
            style={{ animationDelay: `${i * -2}s` }}
          >
            <Cover product={p} className="aspect-[4/3] rounded-2xl" />
            <div className="flex items-center justify-between px-2 py-2">
              <span className="truncate text-xs font-semibold">{p.title}</span>
              <span className="ml-2 text-xs font-bold text-violet-400">${p.price}</span>
            </div>
          </Link>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 320, damping: 20 }}
        className="glass absolute bottom-[30%] right-[-2%] flex items-center gap-2 rounded-2xl px-3 py-2 shadow-glow-pink sm:right-[-6%]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/20">
          <Zap className="h-4 w-4 text-emerald-400" />
        </span>
        <div className="text-left">
          <p className="text-xs text-muted">Just sold</p>
          <p className="text-xs font-bold">Golden Hour · $18</p>
        </div>
      </motion.div>
    </div>
  )
}

function Brands() {
  return (
    <section className="mt-20 sm:mt-24">
      <p className="text-center text-xs font-semibold uppercase tracking-[.25em] text-muted">Trusted by creators at</p>
      <p className="sr-only">{BRANDS.join(", ")}</p>
      <div className="marquee relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
        <div aria-hidden className="flex w-max animate-marquee gap-12 pr-12">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap font-display text-xl font-bold text-muted transition hover:text-fg">
              <span className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500/60 to-hot-500/60" style={{ borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '6px' : '2px 12px' }} />
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stats() {
  // Real counts from the database; the counters animate up to them.
  const { data } = useApi('/api/stats')
  const stats = [
    { value: data?.customers, label: 'Happy customers', icon: Sparkles },
    { value: data?.productsSold, label: 'Products sold', icon: Download },
    { value: data?.fiveStarReviews, label: '5-star reviews', icon: Star },
  ]
  return (
    <section className="section mt-20">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * stagger}>
            <div className="glass group relative overflow-hidden rounded-3xl p-6 text-center sm:p-8">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl transition group-hover:bg-hot-500/30" />
              <s.icon className="mx-auto h-6 w-6 text-violet-400" />
              <p className="text-gradient mt-3 font-display text-4xl font-extrabold sm:text-5xl">
                {s.value === undefined ? <Bone className="mx-auto h-12 w-32" /> : <Counter to={s.value} />}
              </p>
              <p className="mt-1 text-sm font-medium text-muted">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Categories() {
  const { catalog } = useStore()
  return (
    <section className="section mt-24">
      <Reveal className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-hot-400">Categories</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Find your next shortcut</h2>
      </Reveal>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((c, i) => {
          const Icon = CATEGORY_ICONS[c]
          return (
            <Reveal key={c} delay={i * stagger}>
              <Link
                to={`/shop?category=${encodeURIComponent(c)}`}
                className="glass group flex flex-col items-start gap-4 rounded-3xl p-5 transition hover:-translate-y-1 hover:shadow-glow"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-hot-500 shadow-glow transition-transform group-hover:rotate-6 group-hover:scale-110">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <span>
                  <span className="block font-display font-semibold">{c}</span>
                  <span className="text-xs text-muted">{catalog.loading ? '…' : catalog.products.filter((p) => p.category === c).length} products</span>
                </span>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { icon: ShoppingBag, title: 'Pick something great', text: 'Browse hand-picked products from independent creators.' },
    { icon: Lock, title: 'Check out in seconds', text: 'Just your name and email. No account required.' },
    { icon: Download, title: 'Download instantly', text: 'Your files are ready the moment you pay, forever in your library.' },
  ]
  return (
    <section id="how" className="section mt-24 scroll-mt-24">
      <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-12">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-violet-600/30 blur-[90px]" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-hot-500/25 blur-[90px]" />
        <Reveal className="relative text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">From scroll to download in under a minute</h2>
        </Reveal>
        <div className="relative mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * stagger} className="text-center">
              <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bg/60 ring-1 ring-violet-500/30">
                <s.icon className="h-6 w-6 text-violet-400" />
                <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-hot-500 text-xs font-bold text-white">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="section mt-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-hot-500 p-8 text-center text-white sm:p-14">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative">
            <Sparkles className="mx-auto h-8 w-8" />
            <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl">Your next project starts here.</h2>
            <p className="mx-auto mt-3 max-w-md text-white/80">Use code <b className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono">WELCOME10</b> for 10% off your first order.</p>
            <Link to="/shop" className="btn mt-8 bg-white px-8 py-4 text-base text-violet-700 shadow-2xl hover:-translate-y-0.5">
              Browse Products <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
