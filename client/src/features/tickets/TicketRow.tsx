import { Clock, RadioTower } from 'lucide-react'
import { Link } from 'react-router'
import type { TicketListItem } from '../../api/types'
import { PriorityBadge, StatusBadge } from '../../components/Badge'
import { dueLabel, timeAgo } from '../../lib/format'

export function DueText({
  dueAt,
  status,
  overdue,
}: {
  dueAt: string
  status: TicketListItem['status']
  overdue: boolean
}) {
  const label = dueLabel(dueAt, status)
  if (!label) return null
  return (
    <span
      className={
        overdue
          ? 'font-medium text-rose-600 dark:text-rose-400'
          : 'text-slate-500 dark:text-slate-400'
      }
    >
      <Clock className="mr-1 inline size-3.5 -translate-y-px" aria-hidden />
      {label}
    </span>
  )
}

export function TicketCard({ ticket }: { ticket: TicketListItem }) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="block rounded-xl px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-white">
            <span className="mr-1.5 text-slate-400">#{ticket.id}</span>
            {ticket.title}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{ticket.category?.name ?? 'Uncategorized'}</span>
            <span>{timeAgo(ticket.createdAt)}</span>
            <DueText dueAt={ticket.dueAt} status={ticket.status} overdue={ticket.isOverdue} />
            {ticket.incidentId && (
              <span className="text-violet-600 dark:text-violet-300">
                <RadioTower className="mr-1 inline size-3.5" aria-hidden />
                Incident #{ticket.incidentId}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>
    </Link>
  )
}
