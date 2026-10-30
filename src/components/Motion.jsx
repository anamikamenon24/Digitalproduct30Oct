import { useEffect, useRef, useState } from 'react'
import { motion, animate, useInView, useReducedMotion } from 'framer-motion'

// Shared motion tokens so every animation has the same rhythm.
// Enter decelerates (easeOut); exits are shorter (~65% of enter) and accelerate (easeIn).
export const ease = [0.22, 1, 0.36, 1]
export const easeIn = [0.4, 0, 1, 1]
export const duration = { fast: 0.15, base: 0.25, slow: 0.45 }
export const stagger = 0.05
export const exit = { duration: duration.fast, ease: easeIn }
export const spring = { type: 'spring', stiffness: 380, damping: 32 }

export function Page({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: duration.slow, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Counter({ to, suffix = '', decimals = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setValue(to)
      return
    }
    const controls = animate(0, to, { duration: 1.6, ease, onUpdate: setValue })
    return () => controls.stop()
  }, [inView, to, reduce])

  const format = (n) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  // Tabular figures keep the width steady while digits change; screen readers get the final value only.
  return (
    <span ref={ref} className="tabular-nums">
      <span className="sr-only">
        {format(to)}
        {suffix}
      </span>
      <span aria-hidden>
        {format(value)}
        {suffix}
      </span>
    </span>
  )
}
