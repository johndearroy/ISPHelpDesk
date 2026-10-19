import { prisma } from '../db.js'
import type { AuthUser } from '../lib/auth.js'
import { HttpError } from '../lib/httpError.js'
import type { CommentInput } from '../schemas/ticket.js'
import { findVisibleTicket } from './ticketService.js'

const commentInclude = { author: { select: { id: true, name: true, role: true } } } as const

export async function listComments(user: AuthUser, ticketId: number) {
  await findVisibleTicket(user, ticketId)
  return prisma.comment.findMany({
    where: { ticketId },
    include: commentInclude,
    orderBy: { createdAt: 'asc' },
  })
}

export async function addComment(user: AuthUser, ticketId: number, input: CommentInput) {
  const ticket = await findVisibleTicket(user, ticketId)
  if (ticket.status === 'CLOSED') {
    throw new HttpError(409, 'Closed tickets cannot receive new comments')
  }

  return prisma.comment.create({
    data: { ticketId, authorId: user.id, body: input.body },
    include: commentInclude,
  })
}
