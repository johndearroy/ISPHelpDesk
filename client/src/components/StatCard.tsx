import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

const gradients = {
  brand: 'from-brand-500 to-accent-500',
  amber: 'from-amber-400 to-orange-500',
  rose: 'from-rose-500 to-pink-500',
  teal: 'from-teal-400 to-emerald-500',
  sky: 'from-sky-400 to-brand-500',
}

type Props = {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  color?: keyof typeof gradients
}

export function StatCard({ label, value, hint, icon: Icon, color = 'brand' }: Props) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={clsx(
            'grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg',
            gradients[color],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}
