import { prisma } from '../db.js'
import type { Prisma } from '../generated/prisma/client.js'
import type { AuthUser } from '../lib/auth.js'
import { HttpError } from '../lib/httpError.js'
import {
  ACTIVE_STATUSES,
  calculateDueAt,
  canChangeStatus,
  canTransition,
  isOverdue,
  statusLabel,
} from '../lib/ticketRules.js'
import type {
  ChangeStatusInput,
  CreateTicketInput,
  TicketQuery,
  UpdateTicketInput,
} from '../schemas/ticket.js'

const listSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  area: true,
  dueAt: true,
  createdAt: true,
  resolvedAt: true,
  incidentId: true,
  category: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  analysis: { select: { status: true } },
} satisfies Prisma.TicketSelect

export function visibleTo(user: AuthUser): Prisma.TicketWhereInput {
  if (user.role === 'CUSTOMER') return { createdById: user.id }
  if (user.role === 'AGENT') return { OR: [{ assignedToId: user.id }, { assignedToId: null }] }
  return {}
}

export async function findVisibleTicket(user: AuthUser, id: number) {
  const ticket = await prisma.ticket.findFirst({ where: { AND: [{ id }, visibleTo(user)] } })
  if (!ticket) {
    throw new HttpError(404, 'Ticket not found')
  }
  return ticket
}

export async function listTickets(user: AuthUser, query: TicketQuery) {
  const filters: Prisma.TicketWhereInput[] = [
    visibleTo(user),
    {
      status: query.status,
      priority: query.priority,
      categoryId: query.categoryId,
      area: query.area,
    },
  ]

  if (query.search) {
    const search: Prisma.TicketWhereInput[] = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
    const id = Number(query.search.replace('#', ''))
    if (Number.isInteger(id) && id > 0) search.push({ id })
    filters.push({ OR: search })
  }
  if (query.overdue) {
    filters.push({ status: { in: ACTIVE_STATUSES }, dueAt: { lt: new Date() } })
  }
  if (query.assigned === 'me') filters.push({ assignedToId: user.id })
  if (query.assigned === 'unassigned') filters.push({ assignedToId: null })

  const where = { AND: filters }
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: listSelect,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ticket.count({ where }),
  ])

  return {
    items: items.map((ticket) => ({ ...ticket, isOverdue: isOverdue(ticket) })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getTicket(user: AuthUser, id: number) {
  const isStaff = user.role !== 'CUSTOMER'
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id }, visibleTo(user)] },
    include: {
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, area: true } },
      assignedTo: { select: { id: true, name: true } },
      incident: { select: { id: true, title: true, status: true } },
      events: {
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { id: true, name: true } } },
      },
      analysis: isStaff
        ? {
            include: {
              category: { select: { id: true, name: true } },
              finalCategory: { select: { id: true, name: true } },
              reviewedBy: { select: { id: true, name: true } },
            },
          }
        : { select: { status: true } },
    },
  })
  if (!ticket) {
    throw new HttpError(404, 'Ticket not found')
  }

  return { ...ticket, isOverdue: isOverdue(ticket) }
}

export async function createTicket(user: AuthUser, input: CreateTicketInput) {
  const now = new Date()
  return prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      area: user.area,
      createdById: user.id,
      priority: 'MEDIUM',
      dueAt: calculateDueAt('MEDIUM', now),
      createdAt: now,
      events: { create: { actorId: user.id, toStatus: 'OPEN', note: 'Ticket created' } },
      analysis: { create: {} },
    },
    select: listSelect,
  })
}

export async function updateTicket(user: AuthUser, id: number, input: UpdateTicketInput) {
  const ticket = await findVisibleTicket(user, id)

  if (user.role === 'CUSTOMER') {
    if (input.priority !== undefined || input.categoryId !== undefined) {
      throw new HttpError(403, 'Only support staff can change priority or category')
    }
    if (ticket.status !== 'OPEN') {
      throw new HttpError(409, 'You can only edit a ticket before work on it has started')
    }
  }

  const data: Prisma.TicketUncheckedUpdateInput = {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
  }
  if (input.priority && input.priority !== ticket.priority) {
    data.priority = input.priority
    data.dueAt = calculateDueAt(input.priority, ticket.createdAt)
  }

  await prisma.ticket.update({ where: { id }, data })
  return getTicket(user, id)
}

export async function deleteTicket(user: AuthUser, id: number) {
  const ticket = await findVisibleTicket(user, id)

  const ownOpenTicket =
    user.role === 'CUSTOMER' && ticket.createdById === user.id && ticket.status === 'OPEN'
  if (user.role !== 'ADMIN' && !ownOpenTicket) {
    throw new HttpError(403, 'You cannot delete this ticket')
  }

  await prisma.ticket.delete({ where: { id } })
}

export async function changeStatus(user: AuthUser, id: number, input: ChangeStatusInput) {
  const ticket = await findVisibleTicket(user, id)
  const from = ticket.status
  const to = input.status

  if (from === to) {
    throw new HttpError(409, `Ticket is already ${statusLabel(to)}`)
  }
  if (!canTransition(from, to)) {
    throw new HttpError(409, `A ticket cannot move from ${statusLabel(from)} to ${statusLabel(to)}`)
  }
  if (!canChangeStatus(user.role, from, to)) {
    throw new HttpError(403, 'You do not have permission to change this status')
  }
  if (to === 'RESOLVED' && !input.resolutionNote) {
    throw new HttpError(400, 'Please describe how the issue was fixed', {
      resolutionNote: ['Resolution note is required'],
    })
  }

  const data: Prisma.TicketUncheckedUpdateInput = { status: to }
  if (to === 'RESOLVED') {
    data.resolvedAt = new Date()
    data.resolutionNote = input.resolutionNote
  }
  if (from === 'RESOLVED' && to === 'IN_PROGRESS') {
    data.resolvedAt = null
  }
  // an agent starting work on an unassigned ticket takes it
  if (to === 'IN_PROGRESS' && !ticket.assignedToId && user.role !== 'CUSTOMER') {
    data.assignedToId = user.id
  }

  await prisma.ticket.update({
    where: { id },
    data: {
      ...data,
      events: {
        create: { actorId: user.id, fromStatus: from, toStatus: to, note: input.note },
      },
    },
  })
  return getTicket(user, id)
}

export async function assignTicket(user: AuthUser, id: number, assigneeId: number | null) {
  const ticket = await findVisibleTicket(user, id)

  if (ticket.status === 'CLOSED') {
    throw new HttpError(409, 'Closed tickets cannot be reassigned')
  }
  if (user.role === 'AGENT' && assigneeId !== null && assigneeId !== user.id) {
    throw new HttpError(403, 'Agents can only assign tickets to themselves')
  }

  let note = 'Unassigned'
  if (assigneeId !== null) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })
    if (!assignee || assignee.role === 'CUSTOMER') {
      throw new HttpError(400, 'Tickets can only be assigned to support staff')
    }
    note = `Assigned to ${assignee.name}`
  }

  await prisma.ticket.update({
    where: { id },
    data: {
      assignedToId: assigneeId,
      events: {
        create: { actorId: user.id, fromStatus: ticket.status, toStatus: ticket.status, note },
      },
    },
  })
  return getTicket(user, id)
}
