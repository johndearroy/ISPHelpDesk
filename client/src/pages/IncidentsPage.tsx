import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RadioTower, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { errorMessage } from '../api/client'
import { incidentsApi } from '../api/incidents'
import type { OutageSuggestion } from '../api/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback'
import { Field, Input } from '../components/Field'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useCurrentUser } from '../hooks/useAuth'
import { formatDate, timeAgo } from '../lib/format'

function CreateIncidentModal({
  suggestion,
  onClose,
}: {
  suggestion: OutageSuggestion | null
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: () =>
      incidentsApi.create({
        area: suggestion!.area,
        ticketIds: suggestion!.ticketIds,
        title: title.trim() || undefined,
      }),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(`Incident created with ${incident.tickets.length} tickets`)
      navigate(`/incidents/${incident.id}`)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <Modal open={!!suggestion} title="Create incident" onClose={onClose}>
      {suggestion && (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {suggestion.ticketIds.length} tickets from {suggestion.customerCount} customers in{' '}
            {suggestion.area} will be linked. When the incident is resolved, all of them are
            resolved and every customer gets a message.
          </p>
          <Field
            label="Title"
            htmlFor="incident-title"
            hint="Leave empty to let AI write the title and summary"
            className="mt-4"
          >
            <Input
              id="incident-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`Connectivity outage in ${suggestion.area}`}
              maxLength={120}
            />
          </Field>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending}>
              Create incident
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}

export function IncidentsPage() {
  const user = useCurrentUser()
  const [selected, setSelected] = useState<OutageSuggestion | null>(null)
  const suggestions = useQuery({
    queryKey: ['incidents', 'suggestions'],
    queryFn: incidentsApi.suggestions,
    refetchInterval: 30_000,
  })
  const incidents = useQuery({ queryKey: ['incidents', 'list'], queryFn: incidentsApi.list })

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Area-wide problems detected from bursts of similar connection complaints."
      />

      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Outage suggestions
      </h2>
      {suggestions.isError ? (
        <Card>
          <ErrorState message={suggestions.error.message} onRetry={() => suggestions.refetch()} />
        </Card>
      ) : !suggestions.data ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : suggestions.data.length === 0 ? (
        <Card glass>
          <EmptyState
            icon={<RadioTower className="size-6" />}
            title="No outage detected"
            description="Suggestions appear when several customers from one area report similar connection problems within a short time."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {suggestions.data.map((suggestion) => (
            <Card glass key={suggestion.area} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {suggestion.area}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="size-4" aria-hidden />
                    {suggestion.customerCount} customers in the last {suggestion.windowMinutes}{' '}
                    minutes
                  </p>
                </div>
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-rose-500" />
                </span>
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                {suggestion.tickets.slice(0, 4).map((ticket) => (
                  <li key={ticket.id} className="flex justify-between gap-3">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="truncate text-slate-700 hover:text-brand-600 dark:text-slate-300"
                    >
                      #{ticket.id} {ticket.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(ticket.createdAt)}
                    </span>
                  </li>
                ))}
                {suggestion.tickets.length > 4 && (
                  <li className="text-xs text-slate-400">
                    and {suggestion.tickets.length - 4} more
                  </li>
                )}
              </ul>
              {user.role === 'ADMIN' && (
                <Button className="mt-4" size="sm" onClick={() => setSelected(suggestion)}>
                  Create incident
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader title="All incidents" />
        {incidents.isError ? (
          <ErrorState message={incidents.error.message} onRetry={() => incidents.refetch()} />
        ) : !incidents.data ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : incidents.data.length === 0 ? (
          <EmptyState title="No incidents yet" />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.data.map((incident) => (
              <li key={incident.id}>
                <Link
                  to={`/incidents/${incident.id}`}
                  className="flex flex-col gap-2 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      <span className="text-slate-400">#{incident.id}</span> {incident.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {incident.area} · {incident._count.tickets} tickets · opened{' '}
                      {formatDate(incident.createdAt)}
                    </p>
                  </div>
                  <Badge tone={incident.status === 'OPEN' ? 'red' : 'green'}>
                    {incident.status === 'OPEN' ? 'Active' : 'Resolved'}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CreateIncidentModal suggestion={selected} onClose={() => setSelected(null)} />
    </>
  )
}
