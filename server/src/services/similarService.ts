import { rankSimilar } from '../ai/local/similarity.js'
import { maskPii } from '../ai/mask.js'
import { prisma } from '../db.js'
import type { AuthUser } from '../lib/auth.js'
import { HttpError } from '../lib/httpError.js'
import { ACTIVE_STATUSES } from '../lib/ticketRules.js'
import { findVisibleTicket } from './ticketService.js'

const CANDIDATE_LIMIT = 500
const DUPLICATE_SCORE = 0.5

export async function findSimilarResolved(text: string, excludeTicketId?: number, limit = 3) {
  const candidates = await prisma.ticket.findMany({
    where: {
      status: { in: ['RESOLVED', 'CLOSED'] },
      resolutionNote: { not: null },
      id: excludeTicketId ? { not: excludeTicketId } : undefined,
    },
    select: {
      id: true,
      title: true,
      description: true,
      resolutionNote: true,
      resolvedAt: true,
      category: { select: { name: true } },
    },
    orderBy: { resolvedAt: 'desc' },
    take: CANDIDATE_LIMIT,
  })

  const matches = rankSimilar(
    text,
    candidates.map((ticket) => ({ id: ticket.id, text: `${ticket.title} ${ticket.description}` })),
    { limit },
  )

  return matches.map((match) => {
    const ticket = candidates.find((candidate) => candidate.id === match.id)!
    return {
      id: ticket.id,
      title: maskPii(ticket.title),
      resolutionNote: maskPii(ticket.resolutionNote ?? ''),
      category: ticket.category?.name ?? null,
      resolvedAt: ticket.resolvedAt,
      score: Math.round(match.score * 100) / 100,
    }
  })
}

export async function checkNewTicket(
  user: AuthUser,
  input: { title: string; description: string },
) {
  const text = `${input.title} ${input.description}`
  const [similar, openTickets] = await Promise.all([
    findSimilarResolved(text),
    prisma.ticket.findMany({
      where: { createdById: user.id, status: { in: ACTIVE_STATUSES } },
      select: { id: true, title: true, description: true, status: true, createdAt: true },
    }),
  ])

  const [best] = rankSimilar(
    text,
    openTickets.map((ticket) => ({ id: ticket.id, text: `${ticket.title} ${ticket.description}` })),
    { limit: 1, minScore: DUPLICATE_SCORE },
  )
  const duplicate = best ? openTickets.find((ticket) => ticket.id === best.id)! : null

  if (duplicate) {
    await prisma.aiEvent.create({
      data: { type: 'DUPLICATE_WARNED', userId: user.id, matchedTicketId: duplicate.id },
    })
  }

  return {
    similar,
    duplicate: duplicate
      ? {
          id: duplicate.id,
          title: duplicate.title,
          status: duplicate.status,
          createdAt: duplicate.createdAt,
        }
      : null,
  }
}

export async function recordDeflection(user: AuthUser, matchedTicketId: number) {
  const matched = await prisma.ticket.findUnique({ where: { id: matchedTicketId } })
  if (!matched) {
    throw new HttpError(404, 'Ticket not found')
  }
  await prisma.aiEvent.create({
    data: { type: 'DEFLECTED', userId: user.id, matchedTicketId },
  })
}

export async function similarForTicket(user: AuthUser, ticketId: number) {
  const ticket = await findVisibleTicket(user, ticketId)
  return findSimilarResolved(`${ticket.title} ${ticket.description}`, ticketId, 5)
}
