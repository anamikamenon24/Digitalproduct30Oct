import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import Logo from './Logo'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'

export default function Footer() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const [busy, setBusy] = useState(false)

  const subscribe = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await api('/api/newsletter', { method: 'POST', body: { email: email.trim() } })
      setEmail('')
      toast(res.alreadySubscribed ? "You're already on the list. Thanks for the love! ✨" : "You're in! Watch your inbox for fresh drops ✨")
    } catch (err) {
      if (err.field) setError(err.message)
      else toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <footer className="relative z-10 mt-24 border-t hairline pb-28 md:pb-10">
      <div className="section grid gap-10 pt-14 md:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            The home for independent creators selling templates, e-books, presets and mini-courses. Buy once, download instantly.
          </p>
        </div>
        <FooterCol title="Shop" links={[['All products', '/shop'], ['Templates', '/shop?category=Templates'], ['Presets', '/shop?category=Presets'], ['Courses', '/shop?category=Courses']]} />
        <FooterCol title="You" links={[['My Library', '/library'], ['Account', '/account'], ['FAQ', '/#faq']]} />
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-hot-400" /> Get new drops first
          </h2>
          <p className="mt-2 text-sm text-muted">One email a week. Fresh products, creator tips, no spam.</p>
          <form onSubmit={subscribe} className="mt-4" noValidate>
            <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-4 transition focus-within:ring-4 focus-within:ring-violet-500/20">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="you@email.com"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70 sm:text-sm"
                aria-label="Email address"
                aria-invalid={!!error}
                aria-describedby={error ? 'newsletter-error' : undefined}
              />
              <button disabled={busy} aria-busy={busy} className="btn-primary px-4 py-2" aria-label="Subscribe">
                <Send className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <p id="newsletter-error" role="alert" className="mt-2 pl-4 text-xs text-hot-400">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
      <div className="section mt-12 flex flex-col items-center justify-between gap-2 border-t hairline pt-6 text-xs text-muted sm:flex-row">
        <p>© {new Date().getFullYear()} Pixelora. Made with ✨ for creators.</p>
        <p>Demo store · No real payments are processed</p>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 space-y-0.5 text-sm text-muted">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="inline-block py-1.5 transition-colors hover:text-fg">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
