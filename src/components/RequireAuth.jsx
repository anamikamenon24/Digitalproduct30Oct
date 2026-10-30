import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RowSkeleton } from './Skeleton'

// Wraps pages that need an account (Checkout, Success, My Library, Account). Logged-out visitors are
// sent to /login and come straight back afterwards; the cart is kept in the browser meanwhile.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="section pt-10">
        <RowSkeleton rows={2} />
      </div>
    )
  }
  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
