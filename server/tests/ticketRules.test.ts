import { describe, expect, it } from 'vitest'
import {
  calculateDueAt,
  canChangeStatus,
  canTransition,
  isOverdue,
  maxPriority,
} from '../src/lib/ticketRules.js'

describe('sla', () => {
  const createdAt = new Date('2026-01-01T10:00:00Z')

  it('sets the due date from priority', () => {
    expect(calculateDueAt('URGENT', createdAt).toISOString()).toBe('2026-01-01T14:00:00.000Z')
    expect(calculateDueAt('HIGH', createdAt).toISOString()).toBe('2026-01-02T10:00:00.000Z')
    expect(calculateDueAt('MEDIUM', createdAt).toISOString()).toBe('2026-01-03T10:00:00.000Z')
    expect(calculateDueAt('LOW', createdAt).toISOString()).toBe('2026-01-04T10:00:00.000Z')
  })

  it('marks active tickets past their due date as overdue', () => {
    const now = new Date('2026-01-05T00:00:00Z')
    const dueAt = new Date('2026-01-04T00:00:00Z')

    expect(isOverdue({ status: 'OPEN', dueAt }, now)).toBe(true)
    expect(isOverdue({ status: 'IN_PROGRESS', dueAt }, now)).toBe(true)
    expect(isOverdue({ status: 'OPEN', dueAt: new Date('2026-01-06T00:00:00Z') }, now)).toBe(false)
  })

  it('never marks resolved or closed tickets as overdue', () => {
    const now = new Date('2026-01-05T00:00:00Z')
    const dueAt = new Date('2026-01-04T00:00:00Z')

    expect(isOverdue({ status: 'RESOLVED', dueAt }, now)).toBe(false)
    expect(isOverdue({ status: 'CLOSED', dueAt }, now)).toBe(false)
  })
})

describe('status transitions', () => {
  it('follows the workflow', () => {
    expect(canTransition('OPEN', 'IN_PROGRESS')).toBe(true)
    expect(canTransition('IN_PROGRESS', 'RESOLVED')).toBe(true)
    expect(canTransition('RESOLVED', 'CLOSED')).toBe(true)
    expect(canTransition('RESOLVED', 'IN_PROGRESS')).toBe(true)
  })

  it('rejects skipping steps or leaving closed', () => {
    expect(canTransition('OPEN', 'RESOLVED')).toBe(false)
    expect(canTransition('OPEN', 'CLOSED')).toBe(false)
    expect(canTransition('IN_PROGRESS', 'CLOSED')).toBe(false)
    expect(canTransition('CLOSED', 'IN_PROGRESS')).toBe(false)
  })

  it('lets customers only close or reopen a resolved ticket', () => {
    expect(canChangeStatus('CUSTOMER', 'RESOLVED', 'CLOSED')).toBe(true)
    expect(canChangeStatus('CUSTOMER', 'RESOLVED', 'IN_PROGRESS')).toBe(true)
    expect(canChangeStatus('CUSTOMER', 'OPEN', 'IN_PROGRESS')).toBe(false)
    expect(canChangeStatus('CUSTOMER', 'IN_PROGRESS', 'RESOLVED')).toBe(false)
    expect(canChangeStatus('AGENT', 'OPEN', 'IN_PROGRESS')).toBe(true)
  })
})

describe('maxPriority', () => {
  it('returns the more urgent priority', () => {
    expect(maxPriority('LOW', 'HIGH')).toBe('HIGH')
    expect(maxPriority('URGENT', 'MEDIUM')).toBe('URGENT')
    expect(maxPriority('MEDIUM', 'MEDIUM')).toBe('MEDIUM')
  })
})
