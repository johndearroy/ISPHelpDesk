import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, RadioTower, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError, errorMessage } from '../api/client'
import { ticketsApi } from '../api/tickets'
import type { TicketDetail, User } from '../api/types'
import { Badge, PriorityBadge, StatusBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback'
import { Modal } from '../components/Modal'
import { AnalysisPanel } from '../features/tickets/AnalysisPanel'
import { AssignControl } from '../features/tickets/AssignControl'
import { Conversation } from '../features/tickets/Conversation'
import { EditTicketModal } from '../features/tickets/EditTicketModal'
import { SimilarPanel, SummaryPanel, Timeline } from '../features/tickets/SidePanels'
import { StatusActions } from '../features/tickets/StatusActions'
import { DueText } from '../features/tickets/TicketRow'
import { useCurrentUser } from '../hooks/useAuth'
import { formatDate } from '../lib/format'

function canEdit(ticket: TicketDetail, user: User) {
  if (ticket.status === 'CLOSED') return false
  return user.role !== 'CUSTOMER' || ticket.status === 'OPEN'
}

function canDelete(ticket: TicketDetail, user: User) {
  return user.role === 'ADMIN' || (user.role === 'CUSTOMER' && ticket.status === 'OPEN')
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-3 py-2 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  )
}

export function TicketDetailPage() {
  const id = Number(useParams().id)
  const user = useCurrentUser()
  const isStaff = user.role !== 'CUSTOMER'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const ticket = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id),
    // keep checking while the ai triage runs in the background
    refetchInterval: (query) => (query.state.data?.analysis?.status === 'PENDING' ? 2000 : false),
  })
  const commentCount = useQuery({
    queryKey: ['ticket', id, 'comments'],
    queryFn: () => ticketsApi.comments(id),
    select: (comments) => comments.length,
  }).data

  const remove = useMutation({
    mutationFn: () => ticketsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Ticket deleted')
      navigate('/tickets')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (ticket.isError) {
    const notFound = ticket.error instanceof ApiError && ticket.error.status === 404
    return (
      <Card>
        {notFound ? (
          <EmptyState
            title="Ticket not found"
            description="It may have been deleted, or you do not have access to it."
            action={
              <Link to="/tickets" className="text-sm font-medium text-brand-600">
                Back to tickets
              </Link>
            }
          />
        ) : (
          <ErrorState message={ticket.error.message} onRetry={() => ticket.refetch()} />
        )}
      </Card>
    )
  }

  if (!ticket.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  const data = ticket.data

  return (
    <>
      <Link
        to="/tickets"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tickets
      </Link>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <PriorityBadge priority={data.priority} />
            {data.isOverdue && <Badge tone="red">Overdue</Badge>}
            {data.incident && (
              <Link to={isStaff ? `/incidents/${data.incident.id}` : '#'}>
                <Badge tone="violet">
                  <RadioTower className="size-3" aria-hidden />
                  {data.incident.status === 'OPEN' ? 'Part of an area outage' : 'Area outage fixed'}
                </Badge>
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <span className="text-slate-400">#{data.id}</span> {data.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusActions ticket={data} role={user.role} />
          {canEdit(data, user) && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
          )}
          {canDelete(data, user) && (
            <Button variant="ghost" onClick={() => setDeleting(true)} aria-label="Delete ticket">
              <Trash2 className="size-4 text-rose-500" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <p className="p-5 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {data.description}
            </p>
            {data.resolutionNote && (
              <div className="mx-5 mb-5 rounded-xl bg-emerald-50 p-4 text-sm ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  How it was fixed
                </p>
                <p className="mt-1 text-emerald-700 dark:text-emerald-300">{data.resolutionNote}</p>
              </div>
            )}
          </Card>
          <Conversation ticket={data} user={user} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="divide-y divide-slate-100 px-5 py-2 dark:divide-slate-800">
              <DetailRow label="Customer">
                {data.createdBy.name}
                {data.area && <span className="text-slate-500">, {data.area}</span>}
              </DetailRow>
              <DetailRow label="Category">
                {data.analysis?.status === 'PENDING' ? (
                  <span className="animate-pulse text-brand-600">Analyzing...</span>
                ) : (
                  (data.category?.name ?? 'Uncategorized')
                )}
              </DetailRow>
              <DetailRow label="Assigned to">
                {isStaff ? (
                  <AssignControl ticket={data} user={user} />
                ) : (
                  (data.assignedTo?.name ?? 'Not yet')
                )}
              </DetailRow>
              <DetailRow label="Created">{formatDate(data.createdAt)}</DetailRow>
              <DetailRow label="SLA">
                {data.resolvedAt ? (
                  `Resolved ${formatDate(data.resolvedAt)}`
                ) : (
                  <span className="text-xs">
                    <DueText dueAt={data.dueAt} status={data.status} overdue={data.isOverdue} />
                  </span>
                )}
              </DetailRow>
            </dl>
          </Card>

          {isStaff && <AnalysisPanel ticket={data} />}
          {isStaff && commentCount !== undefined && commentCount >= 6 && (
            <SummaryPanel ticketId={data.id} commentCount={commentCount} />
          )}
          {isStaff && <SimilarPanel ticketId={data.id} />}
          <Timeline ticket={data} />
        </div>
      </div>

      <EditTicketModal
        ticket={data}
        isStaff={isStaff}
        open={editing}
        onClose={() => setEditing(false)}
      />

      <Modal open={deleting} title="Delete this ticket?" onClose={() => setDeleting(false)}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The ticket, its conversation and history will be removed. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Delete ticket
          </Button>
        </div>
      </Modal>
    </>
  )
}
