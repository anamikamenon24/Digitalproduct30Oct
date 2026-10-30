import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { computeTotals } from '../lib/money'
import { load, save } from '../lib/storage'
import { useAuth } from './AuthContext'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const { user } = useAuth()

  // Catalogue (all 24 products) — used to show cart lines and the Home hero.
  const [catalog, setCatalog] = useState({ products: [], loading: true, error: null })
  const loadCatalog = useCallback(async () => {
    setCatalog((c) => ({ ...c, loading: true, error: null }))
    try {
      const { products } = await api('/api/products')
      setCatalog({ products, loading: false, error: null })
    } catch (error) {
      setCatalog((c) => ({ ...c, loading: false, error }))
    }
  }, [])
  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])
  const bySlug = useMemo(() => new Map(catalog.products.map((p) => [p.slug, p])), [catalog.products])

  // Cart lives in the browser (works logged out, survives refresh). Prices are only for display;
  // the server re-prices everything at checkout.
  const [cart, setCart] = useState(() => load('pixelora-cart', []))
  const [discount, setDiscount] = useState(() => load('pixelora-discount-v2', null)) // { code, percentOff }
  const [cartOpen, setCartOpen] = useState(false)
  const [cartPulse, setCartPulse] = useState(0)

  useEffect(() => save('pixelora-cart', cart), [cart])
  useEffect(() => save('pixelora-discount-v2', discount), [discount])

  // Drop lines for products that no longer exist (only once the catalogue has loaded).
  useEffect(() => {
    if (!catalog.loading && !catalog.error && catalog.products.length) {
      setCart((c) => (c.every((l) => bySlug.has(l.id)) ? c : c.filter((l) => bySlug.has(l.id))))
    }
  }, [catalog, bySlug])

  const items = useMemo(() => cart.map((c) => ({ ...c, product: bySlug.get(c.id) })).filter((c) => c.product), [cart, bySlug])
  const totals = computeTotals(
    items.map((i) => ({ priceCents: i.product.priceCents, quantity: i.qty })),
    discount?.percentOff ?? 0,
  )
  const count = cart.reduce((s, i) => s + i.qty, 0)

  const addToCart = useCallback((slug, qty = 1) => {
    setCart((c) => {
      const found = c.find((x) => x.id === slug)
      if (found) return c.map((x) => (x.id === slug ? { ...x, qty: Math.min(x.qty + qty, 10) } : x))
      return [...c, { id: slug, qty }]
    })
    setCartPulse((p) => p + 1)
  }, [])

  const removeFromCart = useCallback((slug) => setCart((c) => c.filter((x) => x.id !== slug)), [])
  const setQty = useCallback(
    (slug, qty) => {
      if (qty < 1) return removeFromCart(slug)
      setCart((c) => c.map((x) => (x.id === slug ? { ...x, qty: Math.min(qty, 10) } : x)))
    },
    [removeFromCart],
  )
  const clearCart = useCallback(() => {
    setCart([])
    setDiscount(null)
  }, [])

  // Checks the code with the server; throws an ApiError with a friendly message if it's invalid.
  const applyDiscount = useCallback(async (code) => {
    const result = await api('/api/discount', { method: 'POST', body: { code } })
    if (!result.valid) throw new ApiError(400, result.error, { field: 'code' })
    const applied = { code: result.code, percentOff: result.percentOff }
    setDiscount(applied)
    return applied
  }, [])
  const clearDiscount = useCallback(() => setDiscount(null), [])

  // Owned products (paid only), for "Owned" badges and download buttons.
  const [library, setLibrary] = useState({ items: [], loading: false, error: null })
  const refreshLibrary = useCallback(async () => {
    if (!user) return setLibrary({ items: [], loading: false, error: null })
    setLibrary((l) => ({ ...l, loading: true, error: null }))
    try {
      const { items } = await api('/api/library')
      setLibrary({ items, loading: false, error: null })
    } catch (error) {
      setLibrary((l) => ({ ...l, loading: false, error }))
    }
  }, [user])
  useEffect(() => {
    refreshLibrary()
  }, [refreshLibrary])
  const ownedSlugs = useMemo(() => new Set(library.items.map((i) => i.product.slug)), [library.items])
  const owns = useCallback((slug) => ownedSlugs.has(slug), [ownedSlugs])

  // Creates a pending order + Stripe Checkout session on the server and returns Stripe's URL.
  const startCheckout = useCallback(
    () => api('/api/checkout', { method: 'POST', body: { items: cart.map((c) => ({ slug: c.id, quantity: c.qty })), discountCode: discount?.code } }),
    [cart, discount],
  )

  const value = {
    catalog, bySlug, reloadCatalog: loadCatalog,
    items, count, subtotal: totals.subtotal, discount: totals.discount, total: totals.total, discountCode: discount?.code ?? null,
    addToCart, setQty, removeFromCart, clearCart, applyDiscount, clearDiscount,
    cartOpen, setCartOpen, cartPulse,
    library, refreshLibrary, owns, startCheckout,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
