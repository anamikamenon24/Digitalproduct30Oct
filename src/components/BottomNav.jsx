import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Store, Library, User, ShoppingBag } from 'lucide-react'
import { useStore } from '../context/StoreContext'

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/shop', label: 'Shop', icon: Store },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/account', label: 'Account', icon: User },
]

export default function BottomNav() {
  const { count, setCartOpen } = useStore()
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 md:hidden">
      <div className="glass mx-auto mb-3 flex max-w-md items-center justify-around rounded-3xl px-2 py-2 shadow-2xl shadow-black/30">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="bottom-pill" className="absolute inset-0 rounded-2xl bg-violet-500/15" />}
                <Icon className={`relative h-5 w-5 ${isActive ? 'text-violet-400' : 'text-muted'}`} />
                <span className={`relative text-xs font-semibold ${isActive ? 'text-fg' : 'text-muted'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={() => setCartOpen(true)} className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5" aria-label="Open cart">
          <ShoppingBag className="h-5 w-5 text-muted" />
          {count > 0 && (
            <span className="absolute right-3 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-hot-500 px-1 text-[10px] font-bold text-white">{count}</span>
          )}
          <span className="text-xs font-semibold text-muted">Cart</span>
        </button>
      </div>
    </nav>
  )
}
