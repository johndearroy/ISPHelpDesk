import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { categoriesApi } from '../api/categories'
import { ticketsApi, type TicketFilters } from '../api/tickets'
import type { TicketListItem } from '../api/types'
import { PriorityBadge, StatusBadge } from '../components/Badge'
import { buttonClass } from '../lib/buttonStyles'
import { Card } from '../components/Card'
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback'
import { Input, Select } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { DueText, TicketCard } from '../features/tickets/TicketRow'
import { useCurrentUser } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { AREAS, PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, timeAgo } from '../lib/format'

const FILTER_KEYS = ['status', 'priority', 'categoryId', 'area', 'overdue', 'assigned'] as const

function TicketTable({ tickets, isStaff }: { tickets: TicketListItem[]; isStaff: boolean }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
        <tr>
          <th className="px-4 py-3 font-medium">Ticket</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Priority</th>
          <th className="px-4 py-3 font-medium">Category</th>
          {isStaff && <th className="px-4 py-3 font-medium">Assignee</th>}
          <th className="px-4 py-3 font-medium">SLA</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {tickets.map((ticket) => (
          <tr key={ticket.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
            <td className="max-w-sm px-4 py-3">
              <Link
                to={`/tickets/${ticket.id}`}
                className="block font-medium text-slate-900 hover:text-brand-600 dark:text-white"
              >
                <span className="mr-1.5 text-slate-400">#{ticket.id}</span>
                <span className="truncate">{ticket.title}</span>
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">
                {isStaff && `${ticket.createdBy.name}${ticket.area ? `, ${ticket.area}` : ''} · `}
                {timeAgo(ticket.createdAt)}
              </p>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={ticket.status} />
            </td>
            <td className="px-4 py-3">
              <PriorityBadge priority={ticket.priority} />
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {ticket.analysis?.status === 'PENDING' ? (
                <span className="animate-pulse text-brand-600 dark:text-brand-300">
                  Analyzing...
                </span>
              ) : (
                (ticket.category?.name ?? 'Uncategorized')
              )}
            </td>
            {isStaff && (
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {ticket.assignedTo?.name ?? <span className="text-slate-400">Unassigned</span>}
              </td>
            )}
            <td className="px-4 py-3 text-xs">
              <DueText dueAt={ticket.dueAt} status={ticket.status} overdue={ticket.isOverdue} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TicketListPage() {
  const user = useCurrentUser()
  const isStaff = user.role !== 'CUSTOMER'
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const debouncedSearch = useDebouncedValue(search)

  const filters: TicketFilters = { page: Number(params.get('page') ?? 1), pageSize: 10 }
  for (const key of FILTER_KEYS) filters[key] = params.get(key) ?? undefined
  filters.search = params.get('search') ?? undefined

  function updateParam(key: string, value: string | null) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (debouncedSearch !== (params.get('search') ?? ''))
      updateParam('search', debouncedSearch || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const tickets = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => ticketsApi.list(filters),
    placeholderData: keepPreviousData,
  })
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const hasFilters = FILTER_KEYS.some((key) => params.get(key)) || !!params.get('search')

  return (
    <>
      <PageHeader
        title={isStaff ? 'Tickets' : 'My tickets'}
        description={tickets.data ? `${tickets.data.total} tickets` : 'Loading tickets'}
        actions={
          <Link to="/tickets/new" className={buttonClass()}>
            <Plus className="size-4" aria-hidden />
            New ticket
          </Link>
        }
      />

      <Card glass className="mb-4 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, description or #number"
              className="pl-9"
              aria-label="Search tickets"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
            <Select
              aria-label="Status"
              value={params.get('status') ?? ''}
              onChange={(event) => updateParam('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Priority"
              value={params.get('priority') ?? ''}
              onChange={(event) => updateParam('priority', event.target.value)}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Category"
              value={params.get('categoryId') ?? ''}
              onChange={(event) => updateParam('categoryId', event.target.value)}
            >
              <option value="">All categories</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {isStaff && (
              <>
                <Select
                  aria-label="Area"
                  value={params.get('area') ?? ''}
                  onChange={(event) => updateParam('area', event.target.value)}
                >
                  <option value="">All areas</option>
                  {AREAS.map((area) => (
                    <option key={area}>{area}</option>
                  ))}
                </Select>
                <Select
                  aria-label="Assignment"
                  value={params.get('assigned') ?? ''}
                  onChange={(event) => updateParam('assigned', event.target.value)}
                >
                  <option value="">Anyone</option>
                  <option value="me">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                </Select>
              </>
            )}
            <label className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm whitespace-nowrap text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="size-4 rounded accent-brand-600"
                checked={params.get('overdue') === 'true'}
                onChange={(event) => updateParam('overdue', event.target.checked ? 'true' : null)}
              />
              Overdue only
            </label>
          </div>
        </div>
      </Card>

      <Card>
        {tickets.isError ? (
          <ErrorState message={tickets.error.message} onRetry={() => tickets.refetch()} />
        ) : !tickets.data ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((key) => (
              <Skeleton key={key} className="h-12" />
            ))}
          </div>
        ) : tickets.data.items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? <SlidersHorizontal className="size-6" /> : undefined}
            title={hasFilters ? 'No tickets match these filters' : 'No tickets yet'}
            description={
              hasFilters
                ? 'Try removing a filter or searching for something else.'
                : 'Tickets you create will show up here.'
            }
            action={
              hasFilters ? (
                <button
                  className={buttonClass('secondary', 'sm')}
                  onClick={() => {
                    setSearch('')
                    setParams({})
                  }}
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className={tickets.isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
              <div className="hidden overflow-x-auto md:block">
                <TicketTable tickets={tickets.data.items} isStaff={isStaff} />
              </div>
              <div className="divide-y divide-slate-100 p-1 md:hidden dark:divide-slate-800">
                {tickets.data.items.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800">
              <Pagination
                page={tickets.data.page}
                pageSize={tickets.data.pageSize}
                total={tickets.data.total}
                onChange={(page) => updateParam('page', String(page))}
              />
            </div>
          </>
        )}
      </Card>
    </>
  )
}
