import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, CreditCard, Loader2, ShoppingBag, ArrowLeft, Tag, User, Mail } from 'lucide-react'
import { Page } from '../components/Motion'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCents } from '../lib/money'
import { useSeo } from '../lib/seo'

export default function Checkout() {
  useSeo({ title: 'Checkout', description: 'Secure checkout for your Pixelora order.' })
  const { items, subtotal, discount, total, discountCode, startCheckout, clearDiscount, catalog } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const toldCanceled = useRef(false)

  // Coming back from Stripe without paying: the cart is untouched.
  useEffect(() => {
    if (params.get('canceled') && !toldCanceled.current) {
      toldCanceled.current = true
      toast('Payment canceled. Your cart is still here whenever you are ready.', 'info')
      setParams({}, { replace: true })
    }
  }, [params, setParams, toast])

  if (catalog.loading && items.length === 0) {
    return <Page className="section pt-10" />
  }
  if (items.length === 0 && !paying) {
    return (
      <Page className="section pt-10">
        <EmptyState icon={ShoppingBag} title="Nothing to check out" text="Your cart is empty. Find something you'll love and come back here." action="Browse Products" />
      </Page>
    )
  }

  const pay = async (e) => {
    e.preventDefault()
    setPaying(true)
    setError('')
    try {
      const { url } = await startCheckout()
      // Hand over to Stripe's hosted, secure payment page. The order is only marked paid by
      // Stripe's webhook, never by this page.
      window.location.assign(url)
    } catch (err) {
      setPaying(false)
      if (err.status === 400 && /discount/i.test(err.message)) clearDiscount()
      setError(err.message)
      toast(err.message, 'error')
    }
  }

  return (
    <Page className="section pt-8">
      <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Keep shopping
      </Link>
      <h1 className="mt-4 text-4xl font-extrabold">Checkout</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <form onSubmit={pay} className="glass space-y-5 rounded-[2rem] p-6 sm:p-8" noValidate>
          <div>
            <h2 className="text-lg font-bold">Your details</h2>
            <p className="text-sm text-muted">We'll send your receipt and download links here.</p>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border hairline px-4 py-3">
              <User aria-hidden className="h-5 w-5 text-violet-400" />
              <div className="min-w-0">
                <dt className="text-xs text-muted">Full name</dt>
                <dd className="truncate font-medium">{user.fullName}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border hairline px-4 py-3">
              <Mail aria-hidden className="h-5 w-5 text-violet-400" />
              <div className="min-w-0">
                <dt className="text-xs text-muted">Email</dt>
                <dd className="truncate font-medium">{user.email}</dd>
              </div>
            </div>
          </dl>

          <div className="rounded-2xl border border-dashed border-violet-500/40 bg-violet-500/5 p-4">
            <div className="flex items-center gap-3">
              <CreditCard aria-hidden className="h-5 w-5 shrink-0 text-violet-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Secure payment with Stripe</p>
                <p className="text-xs text-muted">You'll enter your card on Stripe's secure page. Test mode: use card 4242 4242 4242 4242, any future date and any CVC.</p>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-hot-500/10 px-4 py-3 text-sm text-hot-400 ring-1 ring-hot-500/20">
              {error}
            </p>
          )}

          <motion.button whileTap={{ scale: 0.97 }} disabled={paying} aria-busy={paying} className="btn-primary w-full py-4 text-base">
            {paying ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Taking you to secure payment…
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" /> Pay {formatCents(total)}
              </>
            )}
          </motion.button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <Lock className="h-3.5 w-3.5" /> Encrypted &amp; secure checkout
          </p>
        </form>

        <aside className="glass h-fit rounded-[2rem] p-6 sm:p-8 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {items.map(({ id, qty, product }) => (
              <li key={id} className="flex items-center gap-3">
                <div className="relative">
                  <Cover product={product} compact className="h-14 w-14 rounded-xl" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-[10px] font-bold text-white" aria-label={`Quantity ${qty}`}>
                    {qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <p className="text-xs text-muted">{product.format}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatCents(product.priceCents * qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t hairline pt-5 text-sm tabular-nums">
            <div className="flex justify-between text-muted">
              <dt>Subtotal</dt>
              <dd>{formatCents(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> {discountCode}
                </dt>
                <dd>−{formatCents(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <dt>Taxes</dt>
              <dd>Included</dd>
            </div>
            <div className="flex justify-between pt-2 text-lg font-bold">
              <dt>Total</dt>
              <dd data-testid="checkout-total">{formatCents(total)}</dd>
            </div>
          </dl>
          {!discountCode && <p className="mt-4 text-xs text-muted">Have a code? Apply it in your cart. Hint: WELCOME10</p>}
        </aside>
      </div>
    </Page>
  )
}
