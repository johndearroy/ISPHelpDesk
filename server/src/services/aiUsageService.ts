import { readFile } from 'node:fs/promises'
import { aiChain, aiConfigured } from '../ai/index.js'
import { config } from '../config.js'
import { prisma } from '../db.js'

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : null
}

// written by npm run ai:eval, shown on the usage page next to the live numbers
async function readEvaluation() {
  try {
    const report = await readFile(new URL('../ai/reports/latest.json', import.meta.url), 'utf8')
    return JSON.parse(report)
  } catch {
    return null
  }
}

export async function getAiUsage(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [requests, analyses, drafts, events, evaluation] = await Promise.all([
    prisma.aiRequest.findMany({
      where: { createdAt: { gte: since } },
      select: {
        feature: true,
        model: true,
        status: true,
        errorCode: true,
        latencyMs: true,
        promptTokens: true,
        completionTokens: true,
        createdAt: true,
      },
    }),
    prisma.ticketAnalysis.findMany({
      where: { reviewedAt: { gte: since } },
      select: {
        categoryId: true,
        priority: true,
        finalCategoryId: true,
        finalPriority: true,
        category: { select: { name: true } },
      },
    }),
    prisma.replyDraft.findMany({
      where: { createdAt: { gte: since } },
      select: { rating: true, editRatio: true, sentBody: true },
    }),
    prisma.aiEvent.groupBy({ by: ['type'], where: { createdAt: { gte: since } }, _count: true }),
    readEvaluation(),
  ])

  const byModel = new Map<
    string,
    { model: string; success: number; failed: number; errors: Record<string, number> }
  >()
  for (const request of requests) {
    if (!request.model) continue
    const row = byModel.get(request.model) ?? {
      model: request.model,
      success: 0,
      failed: 0,
      errors: {},
    }
    if (request.status === 'SUCCESS') row.success += 1
    if (request.status === 'FAILED') {
      row.failed += 1
      const code = request.errorCode ?? 'unknown'
      row.errors[code] = (row.errors[code] ?? 0) + 1
    }
    byModel.set(request.model, row)
  }

  // a finished request ends with exactly one SUCCESS or FALLBACK row, FAILED rows are attempts
  const successes = requests.filter((request) => request.status === 'SUCCESS')
  const fallbacks = requests.filter((request) => request.status === 'FALLBACK')
  const latencies = successes.map((request) => request.latencyMs).sort((a, b) => a - b)

  const fallbackReasons: Record<string, number> = {}
  for (const request of fallbacks) {
    const reason = request.errorCode ?? 'unknown'
    fallbackReasons[reason] = (fallbackReasons[reason] ?? 0) + 1
  }

  const daily = new Map<string, { date: string; success: number; fallback: number }>()
  for (let i = Math.min(days, 14) - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    daily.set(date, { date, success: 0, fallback: 0 })
  }
  for (const request of [...successes, ...fallbacks]) {
    const row = daily.get(request.createdAt.toISOString().slice(0, 10))
    if (!row) continue
    if (request.status === 'SUCCESS') row.success += 1
    else row.fallback += 1
  }

  const accepted = analyses.filter(
    (analysis) =>
      analysis.categoryId === analysis.finalCategoryId &&
      analysis.priority === analysis.finalPriority,
  )
  const overrides = new Map<string, { category: string; reviewed: number; overridden: number }>()
  for (const analysis of analyses) {
    const name = analysis.category?.name ?? 'Uncategorized'
    const row = overrides.get(name) ?? { category: name, reviewed: 0, overridden: 0 }
    row.reviewed += 1
    if (!accepted.includes(analysis)) row.overridden += 1
    overrides.set(name, row)
  }

  const rated = drafts.filter((draft) => draft.rating !== null)
  const sent = drafts.filter((draft) => draft.editRatio !== null)
  const eventCount = (type: string) => events.find((row) => row.type === type)?._count ?? 0

  return {
    days,
    configured: aiConfigured,
    models: config.OPENROUTER_MODELS,
    coolingDown: aiChain.coolingDown(),
    totals: {
      requests: successes.length + fallbacks.length,
      success: successes.length,
      fallback: fallbacks.length,
      failedAttempts: requests.length - successes.length - fallbacks.length,
      fallbackRate: rate(fallbacks.length, successes.length + fallbacks.length),
      promptTokens: successes.reduce((sum, request) => sum + (request.promptTokens ?? 0), 0),
      completionTokens: successes.reduce(
        (sum, request) => sum + (request.completionTokens ?? 0),
        0,
      ),
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
    },
    byModel: [...byModel.values()].sort((a, b) => b.success + b.failed - (a.success + a.failed)),
    fallbackReasons,
    daily: [...daily.values()],
    triage: {
      reviewed: analyses.length,
      accepted: accepted.length,
      acceptanceRate: rate(accepted.length, analyses.length),
      byCategory: [...overrides.values()].sort((a, b) => b.reviewed - a.reviewed),
    },
    drafts: {
      generated: drafts.length,
      sent: sent.length,
      thumbsUp: rated.filter((draft) => draft.rating === 1).length,
      thumbsDown: rated.filter((draft) => draft.rating === -1).length,
      avgEditRatio: sent.length
        ? Math.round((sent.reduce((sum, draft) => sum + draft.editRatio!, 0) / sent.length) * 100) /
          100
        : null,
    },
    deflections: eventCount('DEFLECTED'),
    duplicateWarnings: eventCount('DUPLICATE_WARNED'),
    evaluation,
  }
}
