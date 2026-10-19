import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { Priority, TicketStatus } from '../api/types'
import { PRIORITY_LABELS, STATUS_LABELS } from '../lib/format'

export type Tone = 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'violet' | 'teal'

const tones: Record<Tone, string> = {
  slate:
    'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  amber:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  green:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  red: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  violet:
    'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30',
}

export function Badge({
  tone = 'slate',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const statusTones: Record<TicketStatus, Tone> = {
  OPEN: 'blue',
  IN_PROGRESS: 'violet',
  RESOLVED: 'green',
  CLOSED: 'slate',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={statusTones[status]}>{STATUS_LABELS[status]}</Badge>
}

const priorityTones: Record<Priority, Tone> = {
  LOW: 'slate',
  MEDIUM: 'teal',
  HIGH: 'amber',
  URGENT: 'red',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={priorityTones[priority]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}
