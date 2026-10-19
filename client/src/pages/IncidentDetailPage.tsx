import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { errorMessage } from '../api/client'
import { incidentsApi } from '../api/incidents'
import { Badge, PriorityBadge, StatusBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { ErrorState, Skeleton } from '../components/Feedback'
import { Field, Textarea } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { useCurrentUser } from '../hooks/useAuth'
import { formatDate, timeAgo } from '../lib/format'

export function IncidentDetailPage() {
  const id = Number(useParams().id)
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  const incident = useQuery({ queryKey: ['incidents', id], queryFn: () => incidentsApi.get(id) })

  const resolve = useMutation({
    mutationFn: () => incidentsApi.resolve(id, note.trim()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success(
        `Incident resolved, ${result.resolvedTickets} tickets updated and customers notified`,
      )
      setNote('')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (incident.isError) {
    return (
      <Card>
        <ErrorState message={incident.error.message} onRetry={() => incident.refetch()} />
      </Card>
    )
  }
  if (!incident.data) return <Skeleton className="h-96 rounded-2xl" />

  const data = incident.data
  const openTickets = data.tickets.filter(
    (ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS',
  )

  return (
    <>
      <Link
        to="/incidents"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Incidents
      </Link>
      <PageHeader
        title={
          <>
            <span className="text-slate-400">#{data.id}</span> {data.title}
          </>
        }
        description={`${data.area} · opened by ${data.createdBy.name} ${timeAgo(data.createdAt)}`}
        actions={
          <Badge tone={data.status === 'OPEN' ? 'red' : 'green'}>
            {data.status === 'OPEN' ? 'Active' : 'Resolved'}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card glass>
            <CardHeader title="Summary" />
            <p className="p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {data.summary}
            </p>
          </Card>

          <Card>
            <CardHeader title={`Linked tickets (${data.tickets.length})`} />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600 dark:text-white"
                    >
                      #{ticket.id} {ticket.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {ticket.createdBy.name} · {timeAgo(ticket.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div>
          {data.status === 'RESOLVED' ? (
            <Card>
              <CardHeader title="Resolution" />
              <div className="space-y-2 p-5 text-sm">
                <p className="text-slate-700 dark:text-slate-200">{data.resolutionNote}</p>
                <p className="text-xs text-slate-500">
                  {data.resolvedBy?.name} · {data.resolvedAt && formatDate(data.resolvedAt)}
                </p>
              </div>
            </Card>
          ) : user.role === 'ADMIN' ? (
            <Card>
              <CardHeader title="Resolve incident" />
              <div className="space-y-4 p-5">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {openTickets.length} open tickets will be resolved and each customer gets a
                  message with this note.
                </p>
                <Field label="What was fixed" htmlFor="incident-note" error={noteError}>
                  <Textarea
                    id="incident-note"
                    value={note}
                    invalid={!!noteError}
                    onChange={(event) => {
                      setNote(event.target.value)
                      setNoteError('')
                    }}
                    placeholder="For example: Replaced the damaged fiber cable near Mirpur 10."
                  />
                </Field>
                <Button
                  className="w-full"
                  loading={resolve.isPending}
                  onClick={() =>
                    note.trim().length < 5
                      ? setNoteError('Describe how the outage was fixed')
                      : resolve.mutate()
                  }
                >
                  <CheckCheck className="size-4" aria-hidden />
                  Resolve incident
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-5 text-sm text-slate-500">Only admins can resolve incidents.</Card>
          )}
        </div>
      </div>
    </>
  )
}
