import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Send, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../api/client'
import { ticketsApi } from '../../api/tickets'
import type { ReplyDraft, TicketDetail, User } from '../../api/types'
import { Button } from '../../components/Button'
import { Card, CardHeader } from '../../components/Card'
import { EmptyState, ErrorState, Skeleton } from '../../components/Feedback'
import { Textarea } from '../../components/Field'
import { timeAgo, titleCase } from '../../lib/format'
import { AiSourceBadge } from './AiBadge'

function DraftRating({
  draft,
  onRated,
}: {
  draft: ReplyDraft
  onRated: (draft: ReplyDraft) => void
}) {
  const rate = useMutation({
    mutationFn: (rating: 1 | -1) => ticketsApi.rateDraft(draft.id, rating),
    onSuccess: (updated) => onRated({ ...draft, rating: updated.rating }),
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-slate-500">Helpful?</span>
      {([1, -1] as const).map((value) => {
        const Icon = value === 1 ? ThumbsUp : ThumbsDown
        return (
          <button
            key={value}
            onClick={() => rate.mutate(value)}
            disabled={rate.isPending}
            className={clsx(
              'rounded-lg p-1.5 transition hover:bg-slate-900/5 dark:hover:bg-white/10',
              draft.rating === value ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400',
            )}
            aria-label={value === 1 ? 'Good draft' : 'Bad draft'}
            aria-pressed={draft.rating === value}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}

export function Conversation({ ticket, user }: { ticket: TicketDetail; user: User }) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [draft, setDraft] = useState<ReplyDraft | null>(null)
  const isStaff = user.role !== 'CUSTOMER'

  const comments = useQuery({
    queryKey: ['ticket', ticket.id, 'comments'],
    queryFn: () => ticketsApi.comments(ticket.id),
  })

  const send = useMutation({
    mutationFn: () =>
      ticketsApi.addComment(ticket.id, { body: body.trim(), replyDraftId: draft?.id }),
    onSuccess: () => {
      setBody('')
      setDraft(null)
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      toast.success('Reply sent')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const generate = useMutation({
    mutationFn: () => ticketsApi.createReplyDraft(ticket.id),
    onSuccess: (created) => {
      setDraft(created)
      setBody(created.body)
      if (created.fallback) toast.info('AI is not available right now, a template was used instead')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <Card>
      <CardHeader title="Conversation" />
      <div className="p-5">
        {comments.isError ? (
          <ErrorState message={comments.error.message} onRetry={() => comments.refetch()} />
        ) : !comments.data ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : comments.data.length === 0 ? (
          <EmptyState
            title="No replies yet"
            description="Messages between you and the support team appear here."
          />
        ) : (
          <ol className="space-y-4">
            {comments.data.map((comment) => {
              const mine = comment.author.id === user.id
              const staffAuthor = comment.author.role !== 'CUSTOMER'
              return (
                <li key={comment.id} className={clsx('flex gap-3', mine && 'flex-row-reverse')}>
                  <div
                    className={clsx(
                      'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white',
                      staffAuthor
                        ? 'bg-gradient-to-br from-brand-500 to-accent-500'
                        : 'bg-gradient-to-br from-teal-400 to-sky-500',
                    )}
                    aria-hidden
                  >
                    {comment.author.name.charAt(0)}
                  </div>
                  <div className={clsx('max-w-[85%] min-w-0', mine && 'text-right')}>
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {comment.author.name}
                      </span>
                      {staffAuthor && ` · ${titleCase(comment.author.role)}`} ·{' '}
                      {timeAgo(comment.createdAt)}
                    </p>
                    <div
                      className={clsx(
                        'mt-1 inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed whitespace-pre-wrap',
                        mine
                          ? 'bg-gradient-to-br from-brand-600 to-accent-600 text-white'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
                      )}
                    >
                      {comment.body}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {ticket.status === 'CLOSED' ? (
          <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-500 dark:bg-slate-800/60">
            This ticket is closed. Open a new ticket if the problem comes back.
          </p>
        ) : (
          <form
            className="mt-6 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (body.trim()) send.mutate()
            }}
          >
            {draft && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-500/10">
                <span className="flex items-center gap-2 text-xs text-brand-700 dark:text-brand-200">
                  AI draft, edit it before sending
                  <AiSourceBadge model={draft.model} />
                </span>
                <DraftRating draft={draft} onRated={setDraft} />
              </div>
            )}
            <Textarea
              aria-label="Reply"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                isStaff ? 'Write a reply to the customer' : 'Add more details or reply to the team'
              }
              rows={draft ? 7 : 4}
            />
            <div className="flex flex-wrap justify-between gap-2">
              {isStaff ? (
                <Button
                  variant="secondary"
                  onClick={() => generate.mutate()}
                  loading={generate.isPending}
                >
                  <Sparkles className="size-4" aria-hidden />
                  {draft ? 'Draft again' : 'Draft with AI'}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={!body.trim()} loading={send.isPending}>
                <Send className="size-4" aria-hidden />
                Send reply
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  )
}
