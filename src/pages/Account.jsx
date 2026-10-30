import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, CalendarDays, ReceiptText, ChevronDown, Package, Wallet, Library, LogOut } from 'lucide-react'
import { Page } from '../components/Motion'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import { RowSkeleton } from '../components/Skeleton'
import { ThemeToggle } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { useApi } from '../lib/api'
import { formatCents } from '../lib/money'
import { useSeo } from '../lib/seo'
import { formatDate } from './Library'

const STATUS = {
  paid: { label: 'Paid', className: 'bg-emerald-500/15 text-emerald-400' },
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  failed: { label: 'Not paid', className: 'bg-hot-500/15 text-hot-400' },
}

export default function Account() {
  useSeo({ title: 'Account', description: 'Your Pixelora account and order history.' })
  const { user, logout } = useAuth()
  const { library } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi('/api/orders')
  const orders = data?.orders ?? []
  const paid = orders.filter((o) => o.status === 'paid')
  const [open, setOpen] = useState(null)
  const spent = paid.reduce((s, o) => s + o.totalCents, 0)
  const initials = user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const onLogout = async () => {
    // Go Home first: if we cleared the user while still on a protected page, it would redirect to /login.
    navigate('/')
    await logout()
    toast("You've been logged out. See you soon!", 'info')
  }

  return (
    <Page className="section pt-10">
      <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-hot-500/25 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-violet-600 via-hot-500 to-violet-600 blur-sm" />
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={`${user.fullName}'s avatar`} className="relative h-24 w-24 rounded-full object-cover ring-4 ring-bg" />
            ) : (
              <div aria-hidden className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-hot-500 font-display text-3xl font-extrabold text-white ring-4 ring-bg">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold">{user.fullName}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 break-all text-sm text-muted sm:justify-start">
              <Mail className="h-4 w-4 shrink-0" /> {user.email}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted sm:justify-start">
              <CalendarDays className="h-4 w-4" /> Member since {formatDate(user.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            Theme <ThemeToggle />
            <button onClick={onLogout} className="btn-ghost ml-1 px-4">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: ReceiptText, label: 'Orders', value: data ? paid.length : '…' },
            { icon: Package, label: 'Products', value: library.items.length },
            { icon: Wallet, label: 'Spent', value: data ? formatCents(spent) : '…' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-bg/50 p-3 text-center ring-1 ring-violet-500/15 sm:p-4">
              <s.icon className="mx-auto h-5 w-5 text-violet-400" />
              <p className="mt-1 font-display text-lg font-bold tabular-nums sm:text-2xl">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-12 text-2xl font-bold">Order history</h2>
      {error && !data ? (
        <LoadError error={error} onRetry={reload} className="mt-5" />
      ) : loading && !data ? (
        <div className="mt-5">
          <RowSkeleton rows={2} />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No orders yet" text="Your receipts and order numbers will show up here after your first purchase." action="Browse Products" />
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((o) => {
            const isOpen = open === o.number
            const qty = o.items.reduce((s, i) => s + i.quantity, 0)
            const status = STATUS[o.status]
            return (
              <div key={o.number} className="glass overflow-hidden rounded-3xl" data-testid="order-row">
                <button onClick={() => setOpen(isOpen ? null : o.number)} className="flex w-full items-center gap-4 p-4 text-left sm:p-5" aria-expanded={isOpen}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/15">
                    <ReceiptText className="h-5 w-5 text-violet-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-mono text-sm font-semibold">
                      {o.number}
                      <span className={`rounded-full px-2 py-0.5 font-sans text-xs font-semibold ${status.className}`}>{status.label}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(o.createdAt)} · {qty} {qty === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <span className="font-display font-bold tabular-nums">{formatCents(o.totalCents)}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                    <ChevronDown className="h-5 w-5 text-muted" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
                      exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
                      className="overflow-hidden"
                    >
                      <ul className="space-y-2 border-t hairline px-5 py-4 text-sm tabular-nums">
                        {o.items.map((i) => (
                          <li key={i.productId} className="flex justify-between gap-4">
                            <Link to={`/product/${i.slug}`} className="truncate hover:text-violet-400">
                              {i.quantity} × {i.title}
                            </Link>
                            <span className="text-muted">{formatCents(i.priceCents * i.quantity)}</span>
                          </li>
                        ))}
                        {o.discountCents > 0 && (
                          <li className="flex justify-between text-emerald-400">
                            <span>Discount{o.discountCode ? ` (${o.discountCode})` : ''}</span>
                            <span>−{formatCents(o.discountCents)}</span>
                          </li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
          <Link to="/library" className="btn-ghost mt-2">
            <Library className="h-4 w-4" /> View my library
          </Link>
        </div>
      )}
    </Page>
  )
}
