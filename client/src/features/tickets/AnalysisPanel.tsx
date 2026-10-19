import { useQuery } from '@tanstack/react-query'
import { Check, LoaderCircle, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { categoriesApi } from '../../api/categories'
import { ticketsApi } from '../../api/tickets'
import type { Priority, TicketDetail } from '../../api/types'
import { Badge, PriorityBadge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card, CardHeader } from '../../components/Card'
import { Select } from '../../components/Field'
import { PRIORITIES, PRIORITY_LABELS, formatDate, titleCase } from '../../lib/format'
import { AiSourceBadge } from './AiBadge'
import { useTicketMutation } from './useTicketMutation'

function ReviewForm({ ticket }: { ticket: TicketDetail }) {
  const analysis = ticket.analysis!
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const [categoryId, setCategoryId] = useState(String(analysis.categoryId ?? ''))
  const [priority, setPriority] = useState<Priority>(analysis.priority ?? ticket.priority)

  const review = useTicketMutation(
    ticket.id,
    () => ticketsApi.reviewAnalysis(ticket.id, { categoryId: Number(categoryId), priority }),
    'Review saved',
  )

  const unchanged = Number(categoryId) === analysis.categoryId && priority === analysis.priority

  return (
    <div className="space-y-3 border-t border-slate-200/70 pt-4 dark:border-white/10">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Review</p>
      <div className="grid grid-cols-2 gap-2">
        <Select
          aria-label="Category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="" disabled>
            Category
          </option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={!categoryId}
        loading={review.isPending}
        onClick={() => review.mutate(undefined)}
      >
        <Check className="size-4" aria-hidden />
        {unchanged ? 'Accept suggestion' : 'Save changes'}
      </Button>
    </div>
  )
}

export function AnalysisPanel({ ticket }: { ticket: TicketDetail }) {
  const analysis = ticket.analysis
  const retry = useTicketMutation(
    ticket.id,
    () => ticketsApi.retryAnalysis(ticket.id),
    'Running the analysis again',
  )

  if (!analysis) return null

  return (
    <Card glass>
      <CardHeader
        title="AI triage"
        icon={<Sparkles className="size-4 text-brand-500" aria-hidden />}
        action={analysis.status !== 'PENDING' && <AiSourceBadge model={analysis.model ?? null} />}
      />
      <div className="space-y-4 p-5 text-sm">
        {analysis.status === 'PENDING' ? (
          <p className="flex items-center gap-2 text-slate-500">
            <LoaderCircle className="size-4 animate-spin text-brand-500" aria-hidden />
            Analyzing the ticket...
          </p>
        ) : analysis.status === 'FAILED' ? (
          <p className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <TriangleAlert className="size-4" aria-hidden />
            The analysis did not finish.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{analysis.category?.name ?? 'Uncategorized'}</Badge>
              {analysis.priority && <PriorityBadge priority={analysis.priority} />}
              {analysis.sentiment && (
                <Badge tone={analysis.sentiment === 'FRUSTRATED' ? 'red' : 'slate'}>
                  {titleCase(analysis.sentiment)}
                </Badge>
              )}
              {analysis.language && <Badge>{titleCase(analysis.language)}</Badge>}
            </div>
            {analysis.summary && (
              <p className="font-medium text-slate-800 dark:text-slate-100">{analysis.summary}</p>
            )}
            {analysis.reason && (
              <p className="text-slate-600 dark:text-slate-300">{analysis.reason}</p>
            )}
            {analysis.ruleRaisedPriority && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Priority raised by a safety rule for critical phrases.
              </p>
            )}
          </>
        )}

        {(analysis.status === 'FALLBACK' || analysis.status === 'FAILED') && (
          <Button
            variant="secondary"
            size="sm"
            loading={retry.isPending}
            onClick={() => retry.mutate(undefined)}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Run again
          </Button>
        )}

        {analysis.reviewedAt ? (
          <p className="border-t border-slate-200/70 pt-4 text-xs text-slate-500 dark:border-white/10">
            Reviewed by {analysis.reviewedBy?.name} on {formatDate(analysis.reviewedAt)}:{' '}
            {analysis.finalCategory?.name},{' '}
            {analysis.finalPriority && PRIORITY_LABELS[analysis.finalPriority].toLowerCase()}{' '}
            priority
          </p>
        ) : (
          analysis.status !== 'PENDING' &&
          analysis.status !== 'FAILED' &&
          ticket.status !== 'CLOSED' && <ReviewForm ticket={ticket} />
        )}
      </div>
    </Card>
  )
}
