import { aiChain } from '../ai/index.js'
import { keywordTriage } from '../ai/local/keywordTriage.js'
import { maskPii } from '../ai/mask.js'
import { applySafetyRules } from '../ai/priorityRules.js'
import { buildTriageMessages, triageSchema } from '../ai/prompts/triage.js'
import { prisma } from '../db.js'
import type { Priority } from '../generated/prisma/client.js'
import type { AuthUser } from '../lib/auth.js'
import { HttpError } from '../lib/httpError.js'
import { calculateDueAt } from '../lib/ticketRules.js'
import { findVisibleTicket } from './ticketService.js'

const running = new Set<Promise<void>>()

export async function triageText(input: { title: string; description: string }, userId?: number) {
  const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
  const names = categories.map((category) => category.name)

  const result = await aiChain.run({
    feature: 'TRIAGE',
    userId,
    messages: buildTriageMessages(categories, {
      title: maskPii(input.title),
      description: maskPii(input.description),
    }),
    schema: triageSchema(names),
    maxTokens: 300,
  })

  const answer = result.ok ? result.data : keywordTriage(input, names)
  const safety = applySafetyRules(`${input.title} ${input.description}`, answer.priority)
  const category = categories.find((item) => item.name === answer.category) ?? null

  return {
    ...answer,
    category: category ? { id: category.id, name: category.name } : null,
    priority: safety.priority,
    ruleRaisedPriority: safety.raised,
    matchedRules: safety.matched,
    model: result.ok ? result.model : null,
    fallbackReason: result.ok ? null : result.reason,
  }
}

export async function analyzeTicket(ticketId: number) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { analysis: true },
  })
  if (!ticket) return

  try {
    const triage = await triageText(ticket, ticket.createdById)

    await prisma.ticketAnalysis.update({
      where: { ticketId },
      data: {
        status: triage.model ? 'DONE' : 'FALLBACK',
        categoryId: triage.category?.id ?? null,
        priority: triage.priority,
        sentiment: triage.sentiment,
        language: triage.language,
        summary: triage.summary,
        reason: triage.reason,
        ruleRaisedPriority: triage.ruleRaisedPriority,
        model: triage.model,
      },
    })

    // suggestions fill the ticket until a staff member has reviewed them
    if (!ticket.analysis?.reviewedAt) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          categoryId: triage.category?.id,
          priority: triage.priority,
          dueAt: calculateDueAt(triage.priority, ticket.createdAt),
        },
      })
    }
  } catch (error) {
    console.error(`Analysis failed for ticket ${ticketId}`, error)
    await prisma.ticketAnalysis
      .update({ where: { ticketId }, data: { status: 'FAILED' } })
      .catch(() => {})
  }
}

export function startAnalysis(ticketId: number) {
  const job = analyzeTicket(ticketId).finally(() => running.delete(job))
  running.add(job)
}

// lets tests wait for background work before resetting the database
export async function waitForAnalyses() {
  await Promise.all(running)
}

// analyses run inside this process, so anything still pending at startup was cut off by a restart
export async function failStaleAnalyses() {
  const { count } = await prisma.ticketAnalysis.updateMany({
    where: { status: 'PENDING' },
    data: { status: 'FAILED' },
  })
  return count
}

export async function getAnalysis(user: AuthUser, ticketId: number) {
  await findVisibleTicket(user, ticketId)
  const analysis = await prisma.ticketAnalysis.findUnique({
    where: { ticketId },
    include: {
      category: { select: { id: true, name: true } },
      finalCategory: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  })
  if (!analysis) {
    throw new HttpError(404, 'This ticket has no AI analysis')
  }
  return analysis
}

export async function reviewAnalysis(
  user: AuthUser,
  ticketId: number,
  input: { categoryId: number; priority: Priority },
) {
  const ticket = await findVisibleTicket(user, ticketId)
  const analysis = await getAnalysis(user, ticketId)
  if (analysis.status === 'PENDING') {
    throw new HttpError(409, 'The analysis is still running')
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } })
  if (!category) {
    throw new HttpError(400, 'Category does not exist', { categoryId: ['Choose a category'] })
  }

  const accepted = analysis.categoryId === input.categoryId && analysis.priority === input.priority
  const note = accepted
    ? 'AI suggestion accepted'
    : `AI suggestion changed to ${category.name}, ${input.priority.toLowerCase()} priority`

  await prisma.$transaction([
    prisma.ticketAnalysis.update({
      where: { ticketId },
      data: {
        finalCategoryId: input.categoryId,
        finalPriority: input.priority,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        categoryId: input.categoryId,
        priority: input.priority,
        dueAt: calculateDueAt(input.priority, ticket.createdAt),
        events: {
          create: { actorId: user.id, fromStatus: ticket.status, toStatus: ticket.status, note },
        },
      },
    }),
  ])

  return getAnalysis(user, ticketId)
}

export async function retryAnalysis(user: AuthUser, ticketId: number) {
  const analysis = await getAnalysis(user, ticketId)
  if (analysis.status !== 'FALLBACK' && analysis.status !== 'FAILED') {
    throw new HttpError(409, 'Only fallback or failed analyses can be run again')
  }

  await prisma.ticketAnalysis.update({ where: { ticketId }, data: { status: 'PENDING' } })
  startAnalysis(ticketId)
  return getAnalysis(user, ticketId)
}
