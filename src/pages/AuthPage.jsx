import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, LogIn, UserPlus, ShoppingBag, Eye, EyeOff } from 'lucide-react'
import { Page } from '../components/Motion'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { useSeo } from '../lib/seo'

// Only allow redirects back into this site (never to another domain).
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/account')

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  useSeo({
    title: isSignup ? 'Create your account' : 'Log in',
    description: isSignup ? 'Create a free Pixelora account to buy and download digital products.' : 'Log in to Pixelora to check out and download your products.',
  })
  const { user, login, signup, loading } = useAuth()
  const { count } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  if (!loading && user) return <Navigate to={next} replace />

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (isSignup && form.fullName.trim().length < 2) errs.fullName = 'Enter your full name (at least 2 letters).'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter an email like name@example.com.'
    if (!form.password) errs.password = 'Enter your password.'
    else if (isSignup && (form.password.length < 8 || !/[a-z]/i.test(form.password) || !/\d/.test(form.password))) {
      errs.password = 'Use at least 8 characters, with a letter and a number.'
    }
    setErrors(errs)
    setFormError('')
    const first = ['fullName', 'email', 'password'].find((k) => errs[k])
    if (first) return document.getElementById(`auth-${first}`)?.focus()

    setBusy(true)
    try {
      const u = isSignup ? await signup(form.fullName.trim(), form.email.trim(), form.password) : await login(form.email.trim(), form.password)
      toast(isSignup ? `Welcome to Pixelora, ${u.fullName.split(' ')[0]}!` : `Welcome back, ${u.fullName.split(' ')[0]}!`)
      navigate(next, { replace: true })
    } catch (err) {
      if (err.field) {
        setErrors({ [err.field]: err.message })
        document.getElementById(`auth-${err.field}`)?.focus()
      } else setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const field = (key, label, type, autoComplete) => {
    const id = `auth-${key}`
    const isPw = key === 'password'
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
        <div className="relative">
          <input
            id={id}
            type={isPw && showPw ? 'text' : type}
            autoComplete={autoComplete}
            value={form[key]}
            onChange={(e) => {
              setForm({ ...form, [key]: e.target.value })
              setErrors({ ...errors, [key]: undefined })
            }}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${id}-error` : isPw && isSignup ? `${id}-help` : undefined}
            className={`input ${isPw ? 'pr-12' : ''} ${errors[key] ? '!border-hot-500 ring-4 ring-hot-500/15' : ''}`}
          />
          {isPw && (
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-fg"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              aria-pressed={showPw}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {errors[key] ? (
          <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-hot-400">
            {errors[key]}
          </p>
        ) : (
          isPw && isSignup && <p id={`${id}-help`} className="mt-1.5 text-xs text-muted">At least 8 characters, with a letter and a number.</p>
        )}
      </div>
    )
  }

  const fromCheckout = next.startsWith('/checkout')

  return (
    <Page className="section flex justify-center pt-10">
      <div className="w-full max-w-md">
        <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hot-500/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="relative">
            <LogoMark className="h-10 w-10" />
            <h1 className="mt-4 text-3xl font-extrabold">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1 text-sm text-muted">
              {isSignup ? 'Buy once, download instantly, keep it forever.' : 'Log in to check out and get your downloads.'}
            </p>

            {fromCheckout && count > 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-2xl bg-violet-500/10 px-4 py-3 text-sm text-violet-300 ring-1 ring-violet-500/20">
                <ShoppingBag className="h-4 w-4 shrink-0" /> Your cart ({count} {count === 1 ? 'item' : 'items'}) is saved. {isSignup ? 'Sign up' : 'Log in'} to finish checking out.
              </p>
            )}

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              {isSignup && field('fullName', 'Full name', 'text', 'name')}
              {field('email', 'Email', 'email', 'email')}
              {field('password', 'Password', 'password', isSignup ? 'new-password' : 'current-password')}
              {formError && (
                <p role="alert" className="rounded-2xl bg-hot-500/10 px-4 py-3 text-sm text-hot-400 ring-1 ring-hot-500/20">
                  {formError}
                </p>
              )}
              <motion.button whileTap={{ scale: 0.97 }} disabled={busy} aria-busy={busy} className="btn-primary w-full py-4 text-base">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : isSignup ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                {busy ? (isSignup ? 'Creating account…' : 'Logging in…') : isSignup ? 'Create account' : 'Log in'}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              {isSignup ? 'Already have an account? ' : 'New to Pixelora? '}
              <Link
                to={`${isSignup ? '/login' : '/signup'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
                className="font-semibold text-violet-400 underline-offset-4 hover:underline"
              >
                {isSignup ? 'Log in' : 'Create an account'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Page>
  )
}
