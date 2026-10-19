import { Link, useRouteError } from 'react-router'
import { Backdrop } from '../components/Backdrop'
import { buttonClass } from '../lib/buttonStyles'

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-6xl font-bold text-transparent">
          404
        </p>
        <p className="mt-3 text-lg font-medium text-slate-900 dark:text-white">
          This page does not exist
        </p>
        <Link to="/" className={buttonClass('primary', 'md', 'mt-6')}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}

export function CrashPage() {
  const error = useRouteError()
  console.error(error)

  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <Backdrop />
      <div className="glass max-w-md rounded-3xl p-8">
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          Something broke on this page
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Try reloading. If it keeps happening, let the support team know.
        </p>
        <button
          className={buttonClass('primary', 'md', 'mt-6')}
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    </div>
  )
}
