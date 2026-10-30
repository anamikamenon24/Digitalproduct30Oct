import { useCallback, useEffect, useRef, useState } from 'react'

// Talks to the /api functions. Same-origin only; the session cookie is httpOnly, so the browser
// never sees the token, the database URL or any Stripe secret.

export class ApiError extends Error {
  constructor(status, message, { code, field } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.field = field
  }
}

const OFFLINE = "We can't reach Pixelora right now. Check your connection and try again."
const SERVER_DOWN = "Pixelora's server isn't responding right now. Please try again in a moment."

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(0, OFFLINE, { code: 'NETWORK' })
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const fallback = res.status >= 500 ? SERVER_DOWN : 'Something went wrong. Please try again.'
    throw new ApiError(res.status, data?.error || fallback, { code: data?.code, field: data?.field })
  }
  return data
}

// Loads `path` (re-loading when it changes). Pass null to skip. Keeps the previous data while a new
// request is in flight, so filters can update without flashing an empty screen.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })
  const controllerRef = useRef(null)

  const load = useCallback(async () => {
    if (!path) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api(path, { signal: controller.signal })
      if (!controller.signal.aborted) setState({ data, error: null, loading: false })
    } catch (error) {
      if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false }))
    }
  }, [path])

  useEffect(() => {
    load()
    return () => controllerRef.current?.abort()
  }, [load])

  return { ...state, reload: load }
}
