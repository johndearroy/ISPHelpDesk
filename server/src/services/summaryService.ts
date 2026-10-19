import { aiChain, aiConfigured } from '../ai/index.js'
import { extractiveSummary } from '../ai/local/templates.js'
import { maskPii } from '../ai/mask.js'
import { buildSummaryMessages, summarySchema, type ThreadSummary } from '../ai/prompts/summary.js'
import { prisma } from '../db.js'
import type { AuthUser } from '../lib/auth.js'
import { findVisibleTicket } from './ticketService.js'

export const SUMMARY_MIN_COMMENTS = 6

export async function getSummary(user: AuthUser, ticketId: number) {
  const ticket = await findVisibleTicket(user, ticketId)
  const comments = await prisma.comment.findMany({
    where: { ticketId },
    include: { author: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (comments.length < SUMMARY_MIN_COMMENTS) {
    return { available: false, minComments: SUMMARY_MIN_COMMENTS, commentCount: comments.length }
  }

  // only regenerate when new comments arrived, or when the last one came from the fallback
  const existing = await prisma.ticketSummary.findUnique({ where: { ticketId } })
  const upToDate = existing?.commentCount === comments.length
  if (existing && upToDate && (existing.model || !aiConfigured)) {
    return {
      available: true,
      ...(JSON.parse(existing.body) as ThreadSummary),
      model: existing.model,
      commentCount: existing.commentCount,
      updatedAt: existing.updatedAt,
    }
  }

  const conversation = comments.map((comment) => ({
    authorName: comment.author.name,
    isStaff: comment.author.role !== 'CUSTOMER',
    body: comment.body,
  }))

  const result = await aiChain.run({
    feature: 'SUMMARY',
    userId: user.id,
    messages: buildSummaryMessages({
      title: maskPii(ticket.title),
      description: maskPii(ticket.description),
      status: ticket.status,
      conversation: conversation.map((comment) => ({ ...comment, body: maskPii(comment.body) })),
    }),
    schema: summarySchema,
    maxTokens: 400,
  })

  const summary = result.ok
    ? result.data
    : extractiveSummary({
        description: ticket.description,
        status: ticket.status,
        comments: conversation,
      })
  const model = result.ok ? result.model : null

  const saved = await prisma.ticketSummary.upsert({
    where: { ticketId },
    create: { ticketId, body: JSON.stringify(summary), commentCount: comments.length, model },
    update: { body: JSON.stringify(summary), commentCount: comments.length, model },
  })

  return {
    available: true,
    ...summary,
    model,
    commentCount: saved.commentCount,
    updatedAt: saved.updatedAt,
  }
}
