import type { Priority, Role, TicketStatus } from '../generated/prisma/client.js'

export const SLA_HOURS: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
}

const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 }

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
}

export const ACTIVE_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS']

export function calculateDueAt(priority: Priority, createdAt: Date) {
  return new Date(createdAt.getTime() + SLA_HOURS[priority] * 60 * 60 * 1000)
}

export function isOverdue(ticket: { status: TicketStatus; dueAt: Date }, now = new Date()) {
  return ACTIVE_STATUSES.includes(ticket.status) && ticket.dueAt < now
}

export function canTransition(from: TicketStatus, to: TicketStatus) {
  return TRANSITIONS[from].includes(to)
}

// customers can only confirm a fix (close) or reopen when the fix did not work
export function canChangeStatus(role: Role, from: TicketStatus, to: TicketStatus) {
  if (role !== 'CUSTOMER') return true
  return from === 'RESOLVED' && (to === 'CLOSED' || to === 'IN_PROGRESS')
}

export function maxPriority(a: Priority, b: Priority) {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b
}

export function statusLabel(status: TicketStatus) {
  return status.replace('_', ' ').toLowerCase()
}
