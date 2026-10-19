import { useQuery } from '@tanstack/react-query'
import {
  AlarmClock,
  ArrowRight,
  BrainCircuit,
  CircleCheck,
  CircleDot,
  Hourglass,
  RadioTower,
  Timer,
} from 'lucide-react'
import { Link } from 'react-router'
import { statsApi } from '../api/stats'
import { ticketsApi } from '../api/tickets'
import { BarList } from '../components/BarList'
import { buttonClass } from '../lib/buttonStyles'
import { Card, CardHeader } from '../components/Card'
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { TicketCard } from '../features/tickets/TicketRow'
import { useCurrentUser } from '../hooks/useAuth'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const user = useCurrentUser()
  const isStaff = user.role !== 'CUSTOMER'
  const stats = useQuery({ queryKey: ['stats'], queryFn: statsApi.get })
  const recent = useQuery({
    queryKey: ['tickets', { pageSize: 5 }],
    queryFn: () => ticketsApi.list({ pageSize: 5 }),
  })

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description={
          isStaff ? 'Here is what needs attention today.' : 'Here is the latest on your tickets.'
        }
      />

      {stats.isError ? (
        <Card>
          <ErrorState message={stats.error.message} onRetry={() => stats.refetch()} />
        </Card>
      ) : !stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {isStaff && !!stats.data.outageSuggestions && (
            <Link
              to="/incidents"
              className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-4 text-white shadow-lg transition hover:brightness-105"
            >
              <RadioTower className="size-5 shrink-0" aria-hidden />
              <p className="flex-1 text-sm font-medium">
                Possible outage detected: {stats.data.outageSuggestions} area
                {stats.data.outageSuggestions > 1 ? 's have' : ' has'} a burst of similar connection
                complaints.
              </p>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Open"
              value={stats.data.statusCounts.OPEN}
              icon={CircleDot}
              color="sky"
            />
            <StatCard
              label="In progress"
              value={stats.data.statusCounts.IN_PROGRESS}
              icon={Hourglass}
              color="brand"
            />
            <StatCard
              label="Overdue"
              value={stats.data.overdue}
              icon={AlarmClock}
              color="rose"
              hint="Past their SLA due time"
            />
            {isStaff ? (
              <StatCard
                label="Avg. resolution"
                value={
                  stats.data.avgResolutionHours === null ? '-' : `${stats.data.avgResolutionHours}h`
                }
                icon={Timer}
                color="teal"
                hint="Tickets resolved in the last 30 days"
              />
            ) : (
              <StatCard
                label="Resolved"
                value={stats.data.statusCounts.RESOLVED + stats.data.statusCounts.CLOSED}
                icon={CircleCheck}
                color="teal"
              />
            )}
          </div>

          {isStaff && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Active incidents"
                value={stats.data.activeIncidents ?? 0}
                icon={RadioTower}
                color="amber"
              />
              <StatCard
                label="AI suggestions accepted"
                value={
                  stats.data.aiAcceptanceRate === null ? '-' : `${stats.data.aiAcceptanceRate}%`
                }
                icon={BrainCircuit}
                color="brand"
                hint="Share of reviewed triage suggestions kept unchanged"
              />
            </div>
          )}
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title={isStaff ? 'Latest tickets' : 'Your recent tickets'}
            action={
              <Link
                to="/tickets"
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                View all
              </Link>
            }
          />
          <div className="p-2">
            {recent.isError ? (
              <ErrorState message={recent.error.message} onRetry={() => recent.refetch()} />
            ) : !recent.data ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-14" />
                ))}
              </div>
            ) : recent.data.items.length ? (
              recent.data.items.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
            ) : (
              <EmptyState
                title="No tickets yet"
                description="When something is not working, open a ticket and we will take it from there."
                action={
                  <Link to="/tickets/new" className={buttonClass('primary', 'sm')}>
                    Open a ticket
                  </Link>
                }
              />
            )}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Tickets by category" />
            <div className="p-5">
              {stats.data ? (
                <BarList items={stats.data.byCategory} />
              ) : (
                <Skeleton className="h-40" />
              )}
            </div>
          </Card>
          {isStaff && (
            <Card>
              <CardHeader title="Tickets by area" />
              <div className="p-5">
                {stats.data ? <BarList items={stats.data.byArea} /> : <Skeleton className="h-40" />}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
