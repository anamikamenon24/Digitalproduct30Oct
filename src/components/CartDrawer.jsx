import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus, Trash2, ShoppingBag, Tag, Lock, Loader2 } from 'lucide-react'
import Cover from './Cover'
import EmptyState from './EmptyState'
import { spring, exit } from './Motion'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { formatCents } from '../lib/money'

export default function CartDrawer() {
  const { cartOpen, setCartOpen, items, setQty, removeFromCart, subtotal, discount, total, discountCode, applyDiscount, clearDiscount } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!cartOpen) return
    const opener = document.activeElement
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') setCartOpen(false)
      // Keep Tab inside the open drawer.
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll('a[href], button:not([disabled]), input')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      // Return focus to whatever opened the drawer, if it is still on the page.
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [cartOpen, setCartOpen])

  const [applying, setApplying] = useState(false)
  const submitCode = async (e) => {
    e.preventDefault()
    if (!code.trim() || applying) return
    setApplying(true)
    try {
      const applied = await applyDiscount(code)
      toast(`${applied.code} applied, ${applied.percentOff}% off!`)
      setCode('')
      setCodeError('')
    } catch (err) {
      setCodeError(err.message)
    } finally {
      setApplying(false)
    }
  }

  const close = () => setCartOpen(false)

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: exit }}
            onClick={close}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l hairline bg-bg/95 backdrop-blur-xl"
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: spring }}
            exit={{ x: '100%', transition: { ...exit, duration: 0.2 } }}
          >
            <div className="flex items-center justify-between border-b hairline px-5 py-4">
              <h2 id="cart-title" className="flex items-center gap-2 text-lg font-bold">
                <ShoppingBag className="h-5 w-5 text-violet-400" /> Your cart
              </h2>
              <button ref={closeRef} onClick={close} className="glass grid h-11 w-11 place-items-center rounded-full" aria-label="Close cart">
                <X className="h-4 w-4" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 items-center">
                <EmptyState
                  icon={ShoppingBag}
                  title="Your cart is feeling light"
                  text="Discover templates, presets and courses made by independent creators."
                  action="Browse Products"
                  onAction={close}
                />
              </div>
            ) : (
              <>
                <ul className="relative flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {/* popLayout: the removed row fades out while the rest slide up via transforms (no height animation). */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {items.map(({ id, qty, product }) => (
                      <motion.li
                        key={id}
                        layout
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 48, transition: exit }}
                        transition={spring}
                        className="glass flex gap-3 rounded-2xl p-2.5"
                      >
                        <Cover product={product} compact className="h-20 w-20 shrink-0 rounded-xl" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate font-display text-sm font-semibold">{product.title}</p>
                          <p className="text-xs text-muted">{product.category}</p>
                          <div className="mt-auto flex items-center justify-between">
                            <div role="group" aria-label={`Quantity of ${product.title}`} className="flex items-center gap-1 rounded-full border hairline p-0.5">
                              <button onClick={() => setQty(id, qty - 1)} className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-violet-500/15 active:bg-violet-500/25" aria-label="Decrease quantity">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span aria-live="polite" className="w-5 text-center text-sm font-semibold tabular-nums">{qty}</span>
                              <button onClick={() => setQty(id, qty + 1)} className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-violet-500/15 active:bg-violet-500/25" aria-label="Increase quantity">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="font-semibold tabular-nums">{formatCents(product.priceCents * qty)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            removeFromCart(id)
                            toast('Removed from cart', 'info')
                          }}
                          className="-m-1.5 grid h-11 w-11 shrink-0 place-items-center self-start rounded-full text-muted transition-colors hover:text-hot-400"
                          aria-label={`Remove ${product.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="space-y-4 border-t hairline px-5 py-5 pb-safe">
                  {discountCode ? (
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                      <span className="flex items-center gap-2 font-semibold">
                        <Tag className="h-4 w-4" /> {discountCode} applied
                      </span>
                      <button onClick={clearDiscount} className="-my-2 -mr-2 min-h-11 px-2 text-xs underline" aria-label={`Remove discount ${discountCode}`}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={submitCode}>
                      <div className="flex gap-2">
                        <input
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value)
                            setCodeError('')
                          }}
                          placeholder="Discount code"
                          className="input py-2.5"
                          aria-label="Discount code"
                          autoCapitalize="characters"
                          autoComplete="off"
                          spellCheck={false}
                          aria-invalid={!!codeError}
                          aria-describedby={codeError ? 'code-error' : undefined}
                        />
                        <button disabled={applying} aria-busy={applying} className="btn-ghost shrink-0 py-2.5">{applying ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Checking code" /> : 'Apply'}</button>
                      </div>
                      {codeError && (
                        <p id="code-error" role="alert" className="mt-2 text-xs text-hot-400">
                          {codeError}
                        </p>
                      )}
                    </form>
                  )}

                  <dl className="space-y-1.5 text-sm tabular-nums">
                    <div className="flex justify-between text-muted">
                      <dt>Subtotal</dt>
                      <dd>{formatCents(subtotal)}</dd>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <dt>Discount</dt>
                        <dd>−{formatCents(discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 text-base font-bold">
                      <dt>Total</dt>
                      <dd>{formatCents(total)}</dd>
                    </div>
                  </dl>

                  <button
                    onClick={() => {
                      close()
                      navigate('/checkout')
                    }}
                    className="btn-primary w-full py-3.5 text-base"
                  >
                    <Lock className="h-4 w-4" /> Checkout
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
