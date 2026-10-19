import { aiChain } from '../ai/index.js'
import { maskPii } from '../ai/mask.js'
import { detectOutages } from '../ai/outage.js'
import { buildIncidentMessages, incidentSchema } from '../ai/prompts/incident.js'
import { config } from '../config.js'
import { prisma } from '../db.js'
import type { IncidentStatus } from '../generated/prisma/client.js'
import type { AuthUser } from '../lib/auth.js'
import { HttpError } from '../lib/httpError.js'
import { ACTIVE_STATUSES, isOverdue } from '../lib/ticketRules.js'
import type { CreateIncidentInput } from '../schemas/incident.js'

const OUTAGE_CATEGORY = 'Connectivity'

const ticketSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  area: true,
  dueAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
} as const

export async function getSuggestions() {
  const since = new Date(Date.now() - config.OUTAGE_WINDOW_MINUTES * 60 * 1000)
  const tickets = await prisma.ticket.findMany({
    where: {
      category: { name: OUTAGE_CATEGORY },
      status: { in: ACTIVE_STATUSES },
      incidentId: null,
      area: { not: null },
      createdAt: { gte: since },
    },
    select: {
      id: true,
      area: true,
      createdById: true,
      createdAt: true,
      title: true,
      description: true,
    },
  })

  const suggestions = detectOutages(
    tickets.map((ticket) => ({
      id: ticket.id,
      area: ticket.area!,
      createdById: ticket.createdById,
      createdAt: ticket.createdAt,
      text: `${ticket.title} ${ticket.description}`,
    })),
    { minCustomers: config.OUTAGE_MIN_TICKETS },
  )

  return suggestions.map((suggestion) => ({
    ...suggestion,
    windowMinutes: config.OUTAGE_WINDOW_MINUTES,
    tickets: tickets
      .filter((ticket) => suggestion.ticketIds.includes(ticket.id))
      .map((ticket) => ({ id: ticket.id, title: ticket.title, createdAt: ticket.createdAt })),
  }))
}

export function listIncidents(status?: IncidentStatus) {
  return prisma.incident.findMany({
    where: { status },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getIncident(id: number) {
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
      tickets: { select: ticketSelect, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!incident) {
    throw new HttpError(404, 'Incident not found')
  }

  return {
    ...incident,
    tickets: incident.tickets.map((ticket) => ({ ...ticket, isOverdue: isOverdue(ticket) })),
  }
}

async function findLinkableTickets(ticketIds: number[], area: string) {
  const tickets = await prisma.ticket.findMany({ where: { id: { in: ticketIds } } })
  if (tickets.length !== new Set(ticketIds).size) {
    throw new HttpError(400, 'Some tickets do not exist')
  }

  const problem = tickets.find(
    (ticket) =>
      ticket.incidentId || !ACTIVE_STATUSES.includes(ticket.status) || ticket.area !== area,
  )
  if (problem) {
    throw new HttpError(
      409,
      `Ticket #${problem.id} cannot be linked: it must be open, from ${area} and not in another incident`,
    )
  }
  return tickets
}

export async function createIncident(user: AuthUser, input: CreateIncidentInput) {
  const tickets = await findLinkableTickets(input.ticketIds, input.area)

  const result = await aiChain.run({
    feature: 'INCIDENT',
    userId: user.id,
    messages: buildIncidentMessages(
      input.area,
      tickets.slice(0, 20).map((ticket) => maskPii(`${ticket.title}: ${ticket.description}`)),
    ),
    schema: incidentSchema,
    maxTokens: 300,
  })

  const summary = result.ok
    ? result.data.summary
    : `${tickets.length} customers in ${input.area} reported connection problems within a short time.`
  const title =
    input.title ?? (result.ok ? result.data.title : `Connectivity outage in ${input.area}`)

  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.incident.create({
      data: { title, area: input.area, summary, createdById: user.id },
    })
    for (const ticket of tickets) {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          incidentId: created.id,
          events: {
            create: {
              actorId: user.id,
              fromStatus: ticket.status,
              toStatus: ticket.status,
              note: `Linked to incident #${created.id}`,
            },
          },
        },
      })
    }
    return created
  })

  return { ...(await getIncident(incident.id)), fallback: !result.ok }
}

export async function linkTickets(user: AuthUser, id: number, ticketIds: number[]) {
  const incident = await getIncident(id)
  if (incident.status !== 'OPEN') {
    throw new HttpError(409, 'Tickets cannot be added to a resolved incident')
  }

  const tickets = await findLinkableTickets(ticketIds, incident.area)
  await prisma.$transaction(
    tickets.map((ticket) =>
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          incidentId: id,
          events: {
            create: {
              actorId: user.id,
              fromStatus: ticket.status,
              toStatus: ticket.status,
              note: `Linked to incident #${id}`,
            },
          },
        },
      }),
    ),
  )
  return getIncident(id)
}

// resolving the incident resolves every linked ticket that is still open, all or nothing
export async function resolveIncident(user: AuthUser, id: number, resolutionNote: string) {
  const incident = await getIncident(id)
  if (incident.status === 'RESOLVED') {
    throw new HttpError(409, 'Incident is already resolved')
  }

  const openTickets = incident.tickets.filter((ticket) => ACTIVE_STATUSES.includes(ticket.status))
  const now = new Date()
  const message =
    `This was part of a network problem in ${incident.area} that affected several customers. ` +
    `It has now been fixed: ${resolutionNote}\n\nIf you still have trouble, reply here and we will reopen your ticket.`

  await prisma.$transaction(async (tx) => {
    await tx.incident.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedById: user.id, resolvedAt: now, resolutionNote },
    })
    for (const ticket of openTickets) {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          resolutionNote,
          events: {
            create: {
              actorId: user.id,
              fromStatus: ticket.status,
              toStatus: 'RESOLVED',
              note: `Resolved with incident #${id}`,
            },
          },
          comments: { create: { authorId: user.id, body: message } },
        },
      })
    }
  })

  return { ...(await getIncident(id)), resolvedTickets: openTickets.length }
}
