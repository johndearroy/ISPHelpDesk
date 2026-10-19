import { useQuery } from '@tanstack/react-query'
import { ticketsApi } from '../../api/tickets'
import type { TicketDetail, User } from '../../api/types'
import { usersApi } from '../../api/users'
import { Button } from '../../components/Button'
import { Select } from '../../components/Field'
import { useTicketMutation } from './useTicketMutation'

export function AssignControl({ ticket, user }: { ticket: TicketDetail; user: User }) {
  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: () => usersApi.list(),
    enabled: user.role === 'ADMIN',
  })
  const assign = useTicketMutation(
    ticket.id,
    (assigneeId: number | null) => ticketsApi.assign(ticket.id, assigneeId),
    'Assignment updated',
  )

  if (ticket.status === 'CLOSED') {
    return <span>{ticket.assignedTo?.name ?? 'Unassigned'}</span>
  }

  if (user.role === 'ADMIN') {
    return (
      <Select
        aria-label="Assignee"
        value={ticket.assignedTo?.id ?? ''}
        disabled={assign.isPending}
        onChange={(event) => assign.mutate(event.target.value ? Number(event.target.value) : null)}
        className="h-9"
      >
        <option value="">Unassigned</option>
        {staff.data
          ?.filter((member) => member.role !== 'CUSTOMER')
          .map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.openTickets} open)
            </option>
          ))}
      </Select>
    )
  }

  const mine = ticket.assignedTo?.id === user.id
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{ticket.assignedTo?.name ?? 'Unassigned'}</span>
      {(mine || !ticket.assignedTo) && (
        <Button
          variant="secondary"
          size="sm"
          loading={assign.isPending}
          onClick={() => assign.mutate(mine ? null : user.id)}
        >
          {mine ? 'Release' : 'Take it'}
        </Button>
      )}
    </div>
  )
}
