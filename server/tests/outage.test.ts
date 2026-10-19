import { describe, expect, it } from 'vitest'
import { type OutageCandidate, detectOutages } from '../src/ai/outage.js'

const now = new Date('2026-01-01T10:00:00Z')

function report(
  id: number,
  customer: number,
  area = 'Mirpur',
  text = 'No internet, connection down',
): OutageCandidate {
  return {
    id,
    area,
    createdById: customer,
    createdAt: new Date(now.getTime() + id * 60_000),
    text,
  }
}

describe('outage detection', () => {
  it('suggests an outage when enough customers in one area report similar problems', () => {
    const tickets = [1, 2, 3, 4, 5].map((id) => report(id, id))
    const [suggestion] = detectOutages(tickets, { minCustomers: 5 })

    expect(suggestion).toMatchObject({ area: 'Mirpur', customerCount: 5 })
    expect(suggestion.ticketIds).toEqual([1, 2, 3, 4, 5])
    expect(suggestion.firstReportAt).toEqual(tickets[0].createdAt)
    expect(suggestion.lastReportAt).toEqual(tickets[4].createdAt)
  })

  it('needs different customers, not many tickets from one customer', () => {
    const tickets = [1, 2, 3, 4, 5, 6].map((id) => report(id, 1))
    expect(detectOutages(tickets, { minCustomers: 5 })).toEqual([])
  })

  it('stays quiet below the threshold', () => {
    const tickets = [1, 2, 3, 4].map((id) => report(id, id))
    expect(detectOutages(tickets, { minCustomers: 5 })).toEqual([])
  })

  it('counts each area separately', () => {
    const tickets = [
      ...[1, 2, 3].map((id) => report(id, id, 'Mirpur')),
      ...[4, 5, 6].map((id) => report(id, id, 'Uttara')),
    ]
    expect(detectOutages(tickets, { minCustomers: 5 })).toEqual([])
    expect(detectOutages(tickets, { minCustomers: 3 }).map((s) => s.area)).toEqual([
      'Mirpur',
      'Uttara',
    ])
  })

  it('leaves out reports that do not look like the others', () => {
    const tickets = [
      ...[1, 2, 3, 4, 5].map((id) => report(id, id)),
      report(6, 6, 'Mirpur', 'Please send me the price list of packages'),
    ]
    const [suggestion] = detectOutages(tickets, { minCustomers: 5 })
    expect(suggestion.ticketIds).not.toContain(6)
  })
})
