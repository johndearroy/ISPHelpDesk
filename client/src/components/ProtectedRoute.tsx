import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { useMe } from '../hooks/useAuth'
import { ErrorState, Spinner } from './Feedback'

type Props = {
  children: ReactNode
  roles?: Role[]
}

export function ProtectedRoute({ children, roles }: Props) {
  const { data: user, isPending, isError, error, refetch } = useMe()
  const location = useLocation()

  if (isPending) return <Spinner />
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return children
}
