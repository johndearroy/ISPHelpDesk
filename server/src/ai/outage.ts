import { cosine, tfidfVectors } from './local/similarity.js'

export type OutageCandidate = {
  id: number
  area: string
  createdById: number
  createdAt: Date
  text: string
}

export type OutageSuggestion = {
  area: string
  ticketIds: number[]
  customerCount: number
  firstReportAt: Date
  lastReportAt: Date
}

export function detectOutages(
  tickets: OutageCandidate[],
  options: { minCustomers: number; minSimilarity?: number },
): OutageSuggestion[] {
  const minSimilarity = options.minSimilarity ?? 0.1
  const byArea = Map.groupBy(tickets, (ticket) => ticket.area)
  const suggestions: OutageSuggestion[] = []

  for (const [area, group] of byArea) {
    const vectors = tfidfVectors(group.map((ticket) => ticket.text))
    // a ticket belongs to the cluster when it looks like at least one other report
    const related = group.filter((_, i) =>
      vectors.some((other, j) => i !== j && cosine(vectors[i], other) >= minSimilarity),
    )

    const customers = new Set(related.map((ticket) => ticket.createdById))
    if (customers.size < options.minCustomers) continue

    const times = related.map((ticket) => ticket.createdAt.getTime())
    suggestions.push({
      area,
      ticketIds: related.map((ticket) => ticket.id),
      customerCount: customers.size,
      firstReportAt: new Date(Math.min(...times)),
      lastReportAt: new Date(Math.max(...times)),
    })
  }

  return suggestions.sort((a, b) => b.customerCount - a.customerCount)
}
