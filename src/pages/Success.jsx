import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Download, Check, Library, ReceiptText, Loader2, XCircle } from 'lucide-react'
import { Page } from '../components/Motion'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { formatCents } from '../lib/money'
import { useSeo } from '../lib/seo'

const POLL_MS = 1500
const GIVE_UP_MS = 45000

// Stripe sends the buyer here after paying, but only Stripe's webhook can mark the order paid.
// So this page asks the server for the order's status and waits until it really is "paid".
export default function Success() {
  useSeo({ title: 'Order confirmation', description: 'Your Pixelora order.' })
  const { order: number } = useParams()
  const { user } = useAuth()
  const { clearCart, refreshLibrary } = useStore()
  const toast = useToast()
  const [order, setOrder] = useState(null)
  const [state, setState] = useState('loading') // loading | pending | paid | failed | missing | slow | error
  const celebrated = useRef(false)

  useEffect(() => {
    let stopped = false
    let timer
    const started = Date.now()
    const check = async () => {
      try {
        const { order } = await api(`/api/orders/${encodeURIComponent(number)}`)
        if (stopped) return
        setOrder(order)
        if (order.status === 'paid') return setState('paid')
        if (order.status === 'failed') return setState('failed')
        if (Date.now() - started > GIVE_UP_MS) return setState('slow')
        setState('pending')
        timer = setTimeout(check, POLL_MS)
      } catch (err) {
        if (stopped) return
        if (err.status === 404) return setState('missing')
        if (Date.now() - started > GIVE_UP_MS) return setState('error')
        timer = setTimeout(check, POLL_MS * 2)
      }
    }
    check()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [number])

  useEffect(() => {
    if (state !== 'paid' || celebrated.current) return
    celebrated.current = true
    clearCart()
    refreshLibrary()
    const colors = ['#8b5cf6', '#ec4899', '#f472b6', '#a78bfa', '#ffffff']
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 }, colors, disableForReducedMotion: true })
    const t = setTimeout(() => {
      confetti({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0 }, colors, disableForReducedMotion: true })
      confetti({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1 }, colors, disableForReducedMotion: true })
    }, 350)
    return () => clearTimeout(t)
  }, [state, clearCart, refreshLibrary])

  if (state === 'missing') {
    return (
      <Page className="section pt-10">
        <EmptyState icon={ReceiptText} title="Order not found" text="We couldn't find that order. Your purchases are always safe in My Library." action="Go to My Library" to="/library" />
      </Page>
    )
  }

  if (state !== 'paid') {
    const failed = state === 'failed'
    const stuck = state === 'slow' || state === 'error'
    return (
      <Page className="section max-w-xl pt-16 text-center">
        <div role="status" aria-live="polite" className="glass rounded-[2rem] p-8">
          {failed ? (
            <XCircle aria-hidden className="mx-auto h-12 w-12 text-hot-400" />
          ) : (
            <Loader2 aria-hidden className="mx-auto h-12 w-12 animate-spin text-violet-400" />
          )}
          <h1 className="mt-5 text-2xl font-extrabold">
            {failed ? "That payment didn't go through" : stuck ? 'Still confirming your payment' : 'Confirming your payment…'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {failed
              ? 'No money was taken. Your cart is still saved, so you can try again.'
              : stuck
                ? "This is taking longer than usual. You don't need to pay again: we'll add your files to My Library as soon as Stripe confirms."
                : 'This usually takes a few seconds. Please keep this page open.'}
          </p>
          {order && <p className="mt-4 font-mono text-xs text-muted">Order {order.number}</p>}
          {(failed || stuck) && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {failed ? (
                <Link to="/checkout" className="btn-primary">Try again</Link>
              ) : (
                <Link to="/library" className="btn-primary">Go to My Library</Link>
              )}
              <Link to="/account" className="btn-ghost">View my orders</Link>
            </div>
          )}
        </div>
      </Page>
    )
  }

  const downloadAll = () => {
    order.items.forEach((i, idx) =>
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = `/api/download/${i.productId}`
        a.download = ''
        document.body.appendChild(a)
        a.click()
        a.remove()
      }, idx * 400),
    )
    toast('Your downloads have started')
  }

  return (
    <Page className="section max-w-2xl pt-12 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-hot-500 shadow-glow-pink"
      >
        <Check className="h-10 w-10 text-white" strokeWidth={3} />
      </motion.div>
      <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">
        You're all <span className="text-gradient">set!</span>
      </h1>
      <p className="mt-3 text-muted">
        Thanks, {user.fullName.split(' ')[0]}! Order <span className="font-mono font-semibold text-fg">{order.number}</span> is paid. A receipt is on its way to {user.email}.
      </p>

      <div className="glass mt-8 rounded-[2rem] p-4 text-left sm:p-6">
        <ul className="space-y-3">
          {order.items.map((i) => (
            <li key={i.productId} className="flex items-center gap-3">
              <Cover product={{ ...i, id: i.slug }} compact className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.title}</p>
                <p className="text-xs text-muted">{i.format}</p>
              </div>
              <a href={`/api/download/${i.productId}`} download className="glass grid h-11 w-11 place-items-center rounded-full hover:shadow-glow" aria-label={`Download ${i.title}`}>
                <Download className="h-4 w-4 text-violet-400" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-between border-t hairline pt-4 text-sm font-bold tabular-nums">
          <span>Total paid</span>
          <span data-testid="success-total">{formatCents(order.totalCents)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={downloadAll} className="btn-primary px-8 py-4 text-base">
          <Download className="h-5 w-5" /> Download now
        </motion.button>
        <Link to="/library" className="btn-ghost px-8 py-4 text-base">
          <Library className="h-5 w-5" /> Go to My Library
        </Link>
      </div>
    </Page>
  )
}
