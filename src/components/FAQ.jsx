import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'

const faqs = [
  ['How do I get my files after buying?', 'Instantly. As soon as checkout completes you get a "Download now" button, and every purchase lives forever in My Library so you can download it again any time.'],
  ['Can I use products for client or commercial work?', 'Yes. Every product includes a standard commercial license for personal and client projects. Reselling the files themselves is not allowed.'],
  ['Do you offer refunds?', "If a file is broken or not as described, we'll refund you within 14 days, no awkward questions asked."],
  ['Which payment methods do you accept?', 'All major cards, Apple Pay and Google Pay. (This demo store uses a mock payment that always succeeds.)'],
  ['I want to sell on Pixelora. How do I start?', 'Creator applications open monthly. Join the newsletter below and you will be the first to know.'],
]

export default function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <div className="space-y-3">
      {faqs.map(([q, a], i) => {
        const isOpen = open === i
        return (
          <div key={q} className={`glass overflow-hidden rounded-2xl transition-shadow ${isOpen ? 'shadow-glow' : ''}`}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display font-semibold"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
            >
              {q}
              <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-400">
                <Plus className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  id={`faq-panel-${i}`}
                >
                  <p className="px-5 pb-5 text-base leading-relaxed text-muted sm:text-sm">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
