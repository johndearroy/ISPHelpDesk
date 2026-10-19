import { Navigate, Outlet, useLocation } from 'react-router'
import { Backdrop } from '../components/Backdrop'
import { Spinner } from '../components/Feedback'
import { useMe } from '../hooks/useAuth'

export function AuthLayout() {
  const { data: user, isPending } = useMe()
  const location = useLocation()

  if (isPending) return <Spinner />
  // after login or register the user lands back where they were going
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <Backdrop />
      <Outlet />
    </div>
  )
}
