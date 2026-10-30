import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function EmptyState({ icon: Icon, title, text, action, to = '/shop', onAction }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-hot-500 opacity-40 blur-2xl" />
        <div className="glass relative grid h-20 w-20 place-items-center rounded-3xl">
          <Icon className="h-9 w-9 text-violet-400" />
        </div>
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{text}</p>
      {action && (
        <Link to={to} onClick={onAction} className="btn-primary mt-6">
          {action}
        </Link>
      )}
    </motion.div>
  )
}
