import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Bumped on every login/signup/logout. A slower "who am I?" answer that started before one of
  // those must not overwrite it (otherwise a quick login could be undone by a stale 401).
  const version = useRef(0)

  const refresh = useCallback(async () => {
    const started = version.current
    let next = null
    // No session hint cookie means nobody is logged in: skip the request (and its 401).
    if (!/(?:^|; )px_has_session=1/.test(document.cookie)) {
      setLoading(false)
      return
    }
    try {
      next = (await api('/api/auth/me')).user
    } catch (err) {
      next = null // 401 (logged out) or server unreachable: treat as logged out
      // Session expired: drop the stale hint so later pages don't ask again.
      if (err.status === 401) document.cookie = 'px_has_session=; Max-Age=0; Path=/; SameSite=Lax'
    }
    if (version.current === started) setUser(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const apply = useCallback((u) => {
    version.current += 1
    setUser(u)
    setLoading(false)
    return u
  }, [])

  const login = useCallback(async (email, password) => apply((await api('/api/auth/login', { method: 'POST', body: { email, password } })).user), [apply])

  const signup = useCallback(
    async (fullName, email, password) => apply((await api('/api/auth/signup', { method: 'POST', body: { fullName, email, password } })).user),
    [apply],
  )

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    apply(null)
  }, [apply])

  const value = useMemo(() => ({ user, loading, login, signup, logout, refresh }), [user, loading, login, signup, logout, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
