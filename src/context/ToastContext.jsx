import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { spring, exit } from '../components/Motion'

const ToastContext = createContext(null)
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (message, type = 'success') => {
      const id = Math.random().toString(36).slice(2)
      const fromBottom = window.matchMedia('(min-width: 768px)').matches
      setToasts((t) => [...t.slice(-2), { id, message, type, fromBottom }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Polite live region: toasts are announced without stealing focus. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:top-auto md:items-end"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type]
            return (
              <motion.div
                key={t.id}
                layout
                // Enter from the edge the toast stack sits on: top on phones, bottom on desktop.
                initial={{ opacity: 0, y: t.fromBottom ? 16 : -16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
                exit={{ opacity: 0, scale: 0.97, transition: exit }}
                className="glass pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl py-2 pl-4 pr-2 shadow-glow"
              >
                <Icon aria-hidden className={`h-5 w-5 shrink-0 ${t.type === 'error' ? 'text-hot-400' : 'text-violet-400'}`} />
                <p className="flex-1 py-1 text-sm font-medium">{t.message}</p>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-fg">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
