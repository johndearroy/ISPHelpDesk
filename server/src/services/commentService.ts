import { prisma } from '../db.js'
import type { AuthUser } from '../lib/auth.js'
import { editRatio } from '../lib/editRatio.js'
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

  if (!input.replyDraftId) {
    return prisma.comment.create({
      data: { ticketId, authorId: user.id, body: input.body },
      include: commentInclude,
    })
  }

  const draft = await prisma.replyDraft.findUnique({
    where: { id: input.replyDraftId },
    include: { comment: true },
  })
  if (user.role === 'CUSTOMER' || !draft || draft.ticketId !== ticketId || draft.comment) {
    throw new HttpError(400, 'This reply draft cannot be used for this comment')
  }

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { ticketId, authorId: user.id, body: input.body, replyDraftId: draft.id },
      include: commentInclude,
    }),
    prisma.replyDraft.update({
      where: { id: draft.id },
      data: { sentBody: input.body, editRatio: editRatio(draft.body, input.body) },
    }),
  ])
  return comment
}
