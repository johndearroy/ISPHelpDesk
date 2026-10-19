import { useQuery } from '@tanstack/react-query'
import { Activity, Gauge, LifeBuoy, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import { useState } from 'react'
import { aiApi } from '../api/ai'
import type { AiUsage, EvaluationReport } from '../api/types'
import { Badge } from '../components/Badge'
import { Card, CardHeader } from '../components/Card'
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback'
import { Select } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { formatDate } from '../lib/format'

const REASON_LABELS: Record<string, string> = {
  no_api_key: 'No API key configured',
  auth_failed: 'API key rejected',
  quota_exceeded: 'User daily quota reached',
  all_models_failed: 'All models failed',
}

function DailyChart({ daily }: { daily: AiUsage['daily'] }) {
  const max = Math.max(1, ...daily.map((day) => day.success + day.fallback))
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {daily.map((day) => (
          <div
            key={day.date}
            className="flex flex-1 flex-col-reverse overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
            style={{ height: '100%' }}
            title={`${day.date}: ${day.success} model answers, ${day.fallback} fallbacks`}
          >
            <div
              className="bg-gradient-to-t from-brand-600 to-accent-500"
              style={{ height: `${(day.success / max) * 100}%` }}
            />
            <div className="bg-amber-400" style={{ height: `${(day.fallback / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{daily[0]?.date.slice(5)}</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-brand-500" /> Model
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400" /> Fallback
          </span>
        </span>
        <span>{daily.at(-1)?.date.slice(5)}</span>
      </div>
    </div>
  )
}

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`

function EvaluationCard({ report }: { report: EvaluationReport }) {
  return (
    <Card>
      <CardHeader
        title="Offline evaluation"
        action={
          <span className="text-xs text-slate-500">
            {report.datasetSize} labeled tickets · {formatDate(report.generatedAt)}
          </span>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-5 py-2 font-medium">Approach</th>
              <th className="px-5 py-2 font-medium">Category</th>
              <th className="px-5 py-2 font-medium">Macro F1</th>
              <th className="px-5 py-2 font-medium">Priority</th>
              <th
                className="px-5 py-2 font-medium"
                title="Urgent or high tickets predicted as medium or low"
              >
                Under-triage
              </th>
              <th className="px-5 py-2 font-medium">Valid answers</th>
              <th className="px-5 py-2 font-medium">English / Banglish / Bangla</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {report.results.map((result) => (
              <tr key={result.name}>
                <td className="max-w-56 truncate px-5 py-2.5 font-medium" title={result.name}>
                  {result.name}
                </td>
                <td className="px-5 py-2.5">{pct(result.category.accuracy)}</td>
                <td className="px-5 py-2.5">{pct(result.category.macroF1)}</td>
                <td className="px-5 py-2.5">{pct(result.priority.accuracy)}</td>
                <td className="px-5 py-2.5">{pct(result.priority.underTriageRate)}</td>
                <td className="px-5 py-2.5">{pct(result.validRate)}</td>
                <td className="px-5 py-2.5 whitespace-nowrap text-slate-500">
                  {['ENGLISH', 'BANGLISH', 'BANGLA']
                    .map((language) => pct(result.category.byLanguage[language] ?? 0))
                    .join(' / ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">
        Outage detection on {report.outage.scenarios} simulated bursts: precision{' '}
        {pct(report.outage.precision)}, recall {pct(report.outage.recall)}. Run{' '}
        <code>npm run ai:eval</code> to refresh.
      </p>
    </Card>
  )
}

export function AiUsagePage() {
  const [days, setDays] = useState(30)
  const usage = useQuery({ queryKey: ['ai-usage', days], queryFn: () => aiApi.usage(days) })

  return (
    <>
      <PageHeader
        title="AI usage"
        description="How the triage assistant performs and how often the fallback chain is needed."
        actions={
          <Select
            aria-label="Period"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-36"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />

      {usage.isError ? (
        <Card>
          <ErrorState message={usage.error.message} onRetry={() => usage.refetch()} />
        </Card>
      ) : !usage.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <UsageContent usage={usage.data} />
      )}
    </>
  )
}

function UsageContent({ usage }: { usage: AiUsage }) {
  const { totals, triage, drafts } = usage

  return (
    <div className="space-y-6">
      {!usage.configured && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
          <ShieldAlert className="size-5 shrink-0" aria-hidden />
          No OpenRouter key or models are configured, so every AI feature is using the local
          fallback.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="AI requests"
          value={totals.requests}
          icon={Activity}
          hint={`${totals.failedAttempts} failed attempts retried or skipped`}
        />
        <StatCard
          label="Fallback rate"
          value={totals.fallbackRate === null ? '-' : `${totals.fallbackRate}%`}
          icon={LifeBuoy}
          color="amber"
          hint={`${totals.fallback} answered by local rules`}
        />
        <StatCard
          label="Latency p50 / p95"
          value={totals.latencyP50 === null ? '-' : `${(totals.latencyP50 / 1000).toFixed(1)}s`}
          icon={Zap}
          color="teal"
          hint={
            totals.latencyP95 === null
              ? 'No model answers yet'
              : `p95 ${(totals.latencyP95 / 1000).toFixed(1)}s`
          }
        />
        <StatCard
          label="Triage accepted"
          value={triage.acceptanceRate === null ? '-' : `${triage.acceptanceRate}%`}
          icon={Gauge}
          color="sky"
          hint={`${triage.accepted} of ${triage.reviewed} reviewed suggestions unchanged`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Requests per day" />
          <div className="p-5">
            <DailyChart daily={usage.daily} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Model chain"
            icon={<Sparkles className="size-4 text-brand-500" aria-hidden />}
          />
          <div className="space-y-3 p-5 text-sm">
            {usage.models.length ? (
              <ol className="space-y-2">
                {usage.models.map((model, index) => {
                  const cooling = usage.coolingDown.find((item) => item.model === model)
                  return (
                    <li key={model} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="mr-2 text-slate-400">{index + 1}.</span>
                        {model}
                      </span>
                      {cooling ? (
                        <Badge tone="amber">Cooling down</Badge>
                      ) : (
                        <Badge tone="green">Ready</Badge>
                      )}
                    </li>
                  )
                })}
                <li className="flex items-center justify-between gap-2 text-slate-500">
                  <span>
                    <span className="mr-2 text-slate-400">{usage.models.length + 1}.</span>
                    Local keyword rules
                  </span>
                  <Badge>Always on</Badge>
                </li>
              </ol>
            ) : (
              <p className="text-slate-500">No models configured.</p>
            )}
            <p className="pt-2 text-xs text-slate-500">
              Tokens: {totals.promptTokens.toLocaleString()} in,{' '}
              {totals.completionTokens.toLocaleString()} out
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Model results" />
          {usage.byModel.length === 0 ? (
            <EmptyState title="No model calls yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-2 font-medium">Model</th>
                    <th className="px-5 py-2 font-medium">Success</th>
                    <th className="px-5 py-2 font-medium">Failed</th>
                    <th className="px-5 py-2 font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usage.byModel.map((row) => (
                    <tr key={row.model}>
                      <td className="max-w-48 truncate px-5 py-2.5" title={row.model}>
                        {row.model}
                      </td>
                      <td className="px-5 py-2.5 text-emerald-600">{row.success}</td>
                      <td className="px-5 py-2.5 text-rose-600">{row.failed}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(row.errors).map(([code, count]) => (
                            <Badge key={code} tone="red">
                              {code} {count}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {Object.keys(usage.fallbackReasons).length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4 text-sm dark:border-slate-800">
              <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
                Why the fallback was used
              </p>
              <ul className="space-y-1">
                {Object.entries(usage.fallbackReasons).map(([reason, count]) => (
                  <li key={reason} className="flex justify-between">
                    <span>{REASON_LABELS[reason] ?? reason}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Usefulness" />
          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            <div>
              <dt className="text-slate-500">Drafts generated</dt>
              <dd className="text-xl font-semibold">{drafts.generated}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Drafts sent</dt>
              <dd className="text-xl font-semibold">{drafts.sent}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Avg. edit before sending</dt>
              <dd className="text-xl font-semibold">
                {drafts.avgEditRatio === null ? '-' : `${Math.round(drafts.avgEditRatio * 100)}%`}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Draft ratings</dt>
              <dd className="text-xl font-semibold">
                {drafts.thumbsUp} up / {drafts.thumbsDown} down
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Solved without a ticket</dt>
              <dd className="text-xl font-semibold">{usage.deflections}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Duplicate warnings</dt>
              <dd className="text-xl font-semibold">{usage.duplicateWarnings}</dd>
            </div>
          </dl>
          {triage.byCategory.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4 text-sm dark:border-slate-800">
              <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
                Triage overrides by suggested category
              </p>
              <ul className="space-y-1">
                {triage.byCategory.map((row) => (
                  <li key={row.category} className="flex justify-between">
                    <span>{row.category}</span>
                    <span className="text-slate-500">
                      {row.overridden} of {row.reviewed} changed
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
      {usage.evaluation && <EvaluationCard report={usage.evaluation} />}
    </div>
  )
}
