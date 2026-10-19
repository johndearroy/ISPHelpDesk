import { useQuery } from '@tanstack/react-query'
import { History, Lightbulb, ScrollText } from 'lucide-react'
import { Link } from 'react-router'
import { ticketsApi } from '../../api/tickets'
import type { TicketDetail } from '../../api/types'
import { Card, CardHeader } from '../../components/Card'
import { Skeleton } from '../../components/Feedback'
import { STATUS_LABELS, formatDate, timeAgo } from '../../lib/format'
import { AiSourceBadge } from './AiBadge'

export function SummaryPanel({
  ticketId,
  commentCount,
}: {
  ticketId: number
  commentCount: number
}) {
  const summary = useQuery({
    queryKey: ['ticket', ticketId, 'summary', commentCount],
    queryFn: () => ticketsApi.summary(ticketId),
  })

  if (summary.data && !summary.data.available) return null

  return (
    <Card glass>
      <CardHeader
        title="Conversation summary"
        icon={<ScrollText className="size-4 text-brand-500" aria-hidden />}
        action={summary.data?.available && <AiSourceBadge model={summary.data.model} />}
      />
      <div className="p-5 text-sm">
        {summary.isError ? (
          <p className="text-rose-600">{summary.error.message}</p>
        ) : !summary.data ? (
          <div className="space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4" />
          </div>
        ) : (
          summary.data.available && (
            <dl className="space-y-3">
              {(
                [
                  ['Issue', summary.data.issue],
                  ['Tried so far', summary.data.tried],
                  ['Current state', summary.data.currentState],
                  ['Next step', summary.data.nextStep],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          )
        )}
      </div>
    </Card>
  )
}

export function SimilarPanel({ ticketId }: { ticketId: number }) {
  const similar = useQuery({
    queryKey: ['ticket', ticketId, 'similar'],
    queryFn: () => ticketsApi.similar(ticketId),
  })

  return (
    <Card>
      <CardHeader
        title="Similar solved tickets"
        icon={<Lightbulb className="size-4 text-amber-500" aria-hidden />}
      />
      <div className="p-5 text-sm">
        {!similar.data ? (
          <Skeleton className="h-16" />
        ) : similar.data.length === 0 ? (
          <p className="text-slate-500">No similar solved tickets found.</p>
        ) : (
          <ul className="space-y-3">
            {similar.data.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/tickets/${item.id}`}
                  className="font-medium text-slate-900 hover:text-brand-600 dark:text-white"
                >
                  #{item.id} {item.title}
                </Link>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">{item.resolutionNote}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {Math.round(item.score * 100)}% match
                  {item.resolvedAt && ` · solved ${timeAgo(item.resolvedAt)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

export function Timeline({ ticket }: { ticket: TicketDetail }) {
  return (
    <Card>
      <CardHeader
        title="History"
        icon={<History className="size-4 text-slate-500" aria-hidden />}
      />
      <ol className="space-y-4 p-5">
        {ticket.events.map((event) => (
          <li key={event.id} className="relative pl-6 text-sm">
            <span className="absolute top-1.5 left-0 size-2.5 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 ring-4 ring-brand-500/15" />
            <p className="text-slate-800 dark:text-slate-100">
              {event.fromStatus && event.fromStatus !== event.toStatus
                ? `${STATUS_LABELS[event.fromStatus]} to ${STATUS_LABELS[event.toStatus]}`
                : (event.note ?? STATUS_LABELS[event.toStatus])}
            </p>
            {event.fromStatus && event.fromStatus !== event.toStatus && event.note && (
              <p className="text-slate-500">{event.note}</p>
            )}
            <p className="text-xs text-slate-400">
              {event.actor?.name ?? 'System'} · {formatDate(event.createdAt)}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  )
}
