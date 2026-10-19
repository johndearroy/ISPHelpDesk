import clsx from 'clsx'
import {
  BrainCircuit,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  RadioTower,
  Sun,
  Tags,
  Ticket,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { Role } from '../api/types'
import { Backdrop } from '../components/Backdrop'
import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { useCurrentUser, useLogout } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { titleCase } from '../lib/format'

const links: { to: string; label: string; icon: typeof Ticket; roles: Role[] }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['CUSTOMER', 'AGENT', 'ADMIN'] },
  { to: '/tickets', label: 'Tickets', icon: Ticket, roles: ['CUSTOMER', 'AGENT', 'ADMIN'] },
  { to: '/incidents', label: 'Incidents', icon: RadioTower, roles: ['AGENT', 'ADMIN'] },
  { to: '/ai-usage', label: 'AI usage', icon: BrainCircuit, roles: ['ADMIN'] },
  { to: '/categories', label: 'Categories', icon: Tags, roles: ['ADMIN'] },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout.mutateAsync()
    toast.success('You are logged out')
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-8">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {links
          .filter((link) => link.roles.includes(user.role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow'
                    : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5',
                )
              }
            >
              <Icon className="size-4.5" aria-hidden />
              {label}
            </NavLink>
          ))}
      </nav>

      <div className="m-3 rounded-2xl bg-white/50 p-3 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-brand-500 text-sm font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {titleCase(user.role)}
              {user.area && ` · ${user.area}`}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/70 hover:text-rose-600 dark:hover:bg-white/10"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <Backdrop />

      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-64 rounded-3xl lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="glass absolute inset-y-0 left-0 w-72 rounded-r-3xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-6 right-4 rounded-lg p-1 text-slate-500"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[17.5rem]">
        <header className="glass sticky top-0 z-20 mx-3 mt-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 lg:mx-6">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-slate-600 lg:hidden dark:text-slate-300"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="hidden text-sm text-slate-500 sm:block dark:text-slate-400">
            Track, triage and resolve customer issues
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle dark mode">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button size="sm" onClick={() => navigate('/tickets/new')}>
              <Plus className="size-4" aria-hidden />
              New ticket
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
