import { aiChain } from '../ai/index.js'
import { templateReply } from '../ai/local/templates.js'
import { maskPii } from '../ai/mask.js'
import { buildReplyDraftMessages, replyDraftSchema } from '../ai/prompts/replyDraft.js'
import { prisma } from '../db.js'
import type { AuthUser } from '../lib/auth.js'
import { HttpError } from '../lib/httpError.js'
import { findSimilarResolved } from './similarService.js'
import { findVisibleTicket } from './ticketService.js'

export async function generateDraft(user: AuthUser, ticketId: number) {
  const ticket = await findVisibleTicket(user, ticketId)
  if (ticket.status === 'CLOSED') {
    throw new HttpError(409, 'Closed tickets cannot receive new replies')
  }

  const [customer, comments, similar] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: ticket.createdById } }),
    prisma.comment.findMany({
      where: { ticketId },
      include: { author: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    findSimilarResolved(`${ticket.title} ${ticket.description}`, ticketId),
  ])

  const result = await aiChain.run({
    feature: 'REPLY_DRAFT',
    userId: user.id,
    messages: buildReplyDraftMessages({
      title: maskPii(ticket.title),
      description: maskPii(ticket.description),
      customerName: customer.name,
      agentName: user.name,
      conversation: comments.slice(-10).map((comment) => ({
        authorName: comment.author.name,
        isStaff: comment.author.role !== 'CUSTOMER',
        body: maskPii(comment.body),
      })),
      similarNotes: similar.map((match) => match.resolutionNote),
    }),
    schema: replyDraftSchema,
    temperature: 0.4,
    maxTokens: 600,
    cache: false,
  })

  const body = result.ok
    ? result.data.reply
    : templateReply({
        customerName: customer.name,
        agentName: user.name,
        similarNote: similar[0]?.resolutionNote,
      })

  const draft = await prisma.replyDraft.create({
    data: { ticketId, requestedById: user.id, body, model: result.ok ? result.model : null },
  })
  return { ...draft, fallback: !result.ok, fallbackReason: result.ok ? null : result.reason }
}

export async function rateDraft(user: AuthUser, draftId: number, rating: number) {
  const draft = await prisma.replyDraft.findUnique({ where: { id: draftId } })
  if (!draft) {
    throw new HttpError(404, 'Draft not found')
  }
  await findVisibleTicket(user, draft.ticketId)

  return prisma.replyDraft.update({ where: { id: draftId }, data: { rating } })
}
