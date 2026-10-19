import clsx from 'clsx'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  glass?: boolean
}

export function Card({ children, className, glass = false }: Props) {
  return (
    <section className={clsx('rounded-2xl', glass ? 'glass' : 'surface', className)}>
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  icon,
  action,
}: {
  title: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-3.5 dark:border-white/5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  )
}
