import { lazy, Suspense, useEffect, useRef } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import CartDrawer from './components/CartDrawer'
import Footer from './components/Footer'
import RequireAuth from './components/RequireAuth'
import { RowSkeleton } from './components/Skeleton'
import Home from './pages/Home'

const Shop = lazy(() => import('./pages/Shop'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Success = lazy(() => import('./pages/Success'))
const Library = lazy(() => import('./pages/Library'))
const Account = lazy(() => import('./pages/Account'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="section pt-10">
      <RowSkeleton rows={2} />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const navType = useNavigationType()
  const mainRef = useRef(null)
  const lastPath = useRef(location.pathname)

  useEffect(() => {
    // Back/forward (POP) keeps the browser's restored scroll position; new navigations start at the top.
    if (navType !== 'POP') window.scrollTo({ top: 0, behavior: 'instant' })
    // Move focus to the new page so screen reader and keyboard users start there, not on the old link.
    if (lastPath.current !== location.pathname) {
      lastPath.current = location.pathname
      mainRef.current?.focus({ preventScroll: true })
    }
  }, [location.pathname, navType])

  return (
    <div className="noise relative min-h-dvh overflow-x-clip">
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <BackgroundGlow />
      <Navbar />
      <main id="main" ref={mainRef} tabIndex={-1} className="relative z-10 pb-24 outline-none md:pb-0">
        {/* Keyed by path so each page remounts and plays its fade-in. No exit animation:
            AnimatePresence mode="wait" could get stuck on fast navigation and leave a blank page. */}
        <Suspense fallback={<PageFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          {/* These need an account; the cart is kept while the visitor logs in. */}
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/success/:order" element={<RequireAuth><Success /></RequireAuth>} />
          <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
      <CartDrawer />
    </div>
  )
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-600/10 blur-[120px] dark:bg-violet-600/30" />
      <div className="absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full bg-hot-500/10 blur-[130px] dark:bg-hot-500/20" />
      <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-[120px]" />
    </div>
  )
}
