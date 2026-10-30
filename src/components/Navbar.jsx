import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'
import { ShoppingBag, Sun, Moon, User, LogOut } from 'lucide-react'
import Logo from './Logo'
import { useStore } from '../context/StoreContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const links = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/library', label: 'My Library' },
]

export function CartButton() {
  const { count, setCartOpen, cartPulse } = useStore()
  const controls = useAnimationControls()

  useEffect(() => {
    if (cartPulse) controls.start({ scale: [1, 1.2, 0.95, 1.05, 1], rotate: [0, -8, 6, 0, 0], transition: { duration: 0.45, ease: 'easeOut' } })
  }, [cartPulse, controls])

  return (
    <motion.button
      animate={controls}
      onClick={() => setCartOpen(true)}
      className="glass relative grid h-11 w-11 place-items-center rounded-full transition-shadow hover:shadow-glow"
      aria-label={`Open cart, ${count} items`}
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-violet-600 to-hot-500 px-1 text-[11px] font-bold text-white"
        >
          {count}
        </motion.span>
      )}
    </motion.button>
  )
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="glass grid h-11 w-11 place-items-center rounded-full transition-shadow hover:shadow-glow" aria-label="Toggle light/dark mode">
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </motion.span>
    </button>
  )
}

// Logged in: avatar + first name (links to Account) and a logout button. Logged out: "Log in".
function UserMenu() {
  const { user, loading, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  if (loading) return <span aria-hidden className="h-11 w-11 animate-pulse rounded-full bg-fg/[0.07]" />

  if (!user) {
    return (
      <Link to="/login" className="glass flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-shadow hover:shadow-glow sm:px-4" aria-label="Log in">
        <User className="h-5 w-5" />
        <span className="hidden sm:inline">Log in</span>
      </Link>
    )
  }

  const first = user.fullName.split(' ')[0]
  const initials = user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const onLogout = async () => {
    // Go Home first: if we cleared the user while still on a protected page, it would redirect to /login.
    navigate('/')
    await logout()
    toast("You've been logged out. See you soon!", 'info')
  }
  return (
    <>
      <Link to="/account" className="glass flex h-11 items-center gap-2 rounded-full pl-1 pr-1 transition-shadow hover:shadow-glow lg:pr-4" aria-label={`Account: ${user.fullName}`}>
        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-hot-500 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-semibold lg:inline">{first}</span>
      </Link>
      <button onClick={onLogout} className="glass hidden h-11 w-11 place-items-center rounded-full transition-shadow hover:shadow-glow md:grid" aria-label="Log out">
        <LogOut className="h-5 w-5" />
      </button>
    </>
  )
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-bg/85 pb-2 pt-3 backdrop-blur-xl">
      <div className="section">
        <nav className="glass flex h-14 items-center justify-between rounded-full pl-4 pr-2 shadow-lg shadow-black/5 md:h-16 md:pl-6">
          <Logo />
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `relative block rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'text-fg' : 'text-muted hover:text-fg'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-violet-500/15 ring-1 ring-violet-500/30" />
                      )}
                      <span className="relative">{l.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
            <CartButton />
          </div>
        </nav>
      </div>
    </header>
  )
}
