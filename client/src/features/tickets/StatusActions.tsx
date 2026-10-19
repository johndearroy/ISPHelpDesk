import { CheckCheck, Play, RotateCcw, Wrench } from 'lucide-react'
import { useState } from 'react'
import { ticketsApi } from '../../api/tickets'
import type { Role, TicketDetail, TicketStatus } from '../../api/types'
import { Button } from '../../components/Button'
import { Field, Textarea } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { useTicketMutation } from './useTicketMutation'

export function StatusActions({ ticket, role }: { ticket: TicketDetail; role: Role }) {
  const [resolving, setResolving] = useState(false)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  const change = useTicketMutation(
    ticket.id,
    (input: { status: TicketStatus; resolutionNote?: string }) =>
      ticketsApi.changeStatus(ticket.id, input),
    'Status updated',
  )

  const isStaff = role !== 'CUSTOMER'
  const busy = (status: TicketStatus) => change.isPending && change.variables?.status === status

  function resolve() {
    if (note.trim().length < 5) {
      setNoteError('Describe how the issue was fixed')
      return
    }
    change.mutate(
      { status: 'RESOLVED', resolutionNote: note.trim() },
      {
        onSuccess: () => {
          setResolving(false)
          setNote('')
        },
      },
    )
  }

  return (
    <>
      {isStaff && ticket.status === 'OPEN' && (
        <Button
          onClick={() => change.mutate({ status: 'IN_PROGRESS' })}
          loading={busy('IN_PROGRESS')}
        >
          <Play className="size-4" aria-hidden />
          Start work
        </Button>
      )}
      {isStaff && ticket.status === 'IN_PROGRESS' && (
        <Button onClick={() => setResolving(true)}>
          <Wrench className="size-4" aria-hidden />
          Resolve
        </Button>
      )}
      {ticket.status === 'RESOLVED' && (
        <>
          <Button onClick={() => change.mutate({ status: 'CLOSED' })} loading={busy('CLOSED')}>
            <CheckCheck className="size-4" aria-hidden />
            {isStaff ? 'Close' : 'Confirm it is fixed'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => change.mutate({ status: 'IN_PROGRESS' })}
            loading={busy('IN_PROGRESS')}
          >
            <RotateCcw className="size-4" aria-hidden />
            {isStaff ? 'Reopen' : 'Still not working'}
          </Button>
        </>
      )}

      <Modal open={resolving} title="Resolve ticket" onClose={() => setResolving(false)}>
        <Field
          label="Resolution note"
          htmlFor="resolution-note"
          error={noteError}
          hint="This is shown to the customer and helps with similar tickets later."
        >
          <Textarea
            id="resolution-note"
            value={note}
            invalid={!!noteError}
            onChange={(event) => {
              setNote(event.target.value)
              setNoteError('')
            }}
            placeholder="For example: Replaced the damaged patch cord and restarted the ONU."
          />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResolving(false)}>
            Cancel
          </Button>
          <Button onClick={resolve} loading={busy('RESOLVED')}>
            Mark as resolved
          </Button>
        </div>
      </Modal>
    </>
  )
}
