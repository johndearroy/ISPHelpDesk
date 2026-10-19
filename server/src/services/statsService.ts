import { prisma } from '../db.js'
import type { AuthUser } from '../lib/auth.js'
import { ACTIVE_STATUSES } from '../lib/ticketRules.js'
import { visibleTo } from './ticketService.js'

export async function getStats(user: AuthUser) {
  const where = visibleTo(user)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [byStatus, overdue, byCategory, byArea, resolved, categories] = await Promise.all([
    prisma.ticket.groupBy({ by: ['status'], where, _count: true }),
    prisma.ticket.count({
      where: { AND: [where, { status: { in: ACTIVE_STATUSES }, dueAt: { lt: new Date() } }] },
    }),
    prisma.ticket.groupBy({ by: ['categoryId'], where, _count: true }),
    prisma.ticket.groupBy({
      by: ['area'],
      where: { AND: [where, { area: { not: null } }] },
      _count: true,
    }),
    prisma.ticket.findMany({
      where: { AND: [where, { resolvedAt: { gte: since } }] },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ])

  let aiAcceptanceRate: number | null = null
  if (user.role !== 'CUSTOMER') {
    const reviewed = await prisma.ticketAnalysis.findMany({
      where: { reviewedAt: { not: null } },
      select: { categoryId: true, priority: true, finalCategoryId: true, finalPriority: true },
    })
    const accepted = reviewed.filter(
      (analysis) =>
        analysis.categoryId === analysis.finalCategoryId &&
        analysis.priority === analysis.finalPriority,
    ).length
    aiAcceptanceRate = reviewed.length ? Math.round((accepted / reviewed.length) * 1000) / 10 : null
  }

  const statusCounts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 }
  for (const row of byStatus) statusCounts[row.status] = row._count

  const totalHours = resolved.reduce(
    (sum, ticket) => sum + (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / 3_600_000,
    0,
  )
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))

  return {
    statusCounts,
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    overdue,
    avgResolutionHours: resolved.length
      ? Math.round((totalHours / resolved.length) * 10) / 10
      : null,
    byCategory: byCategory
      .map((row) => ({
        name: row.categoryId ? (categoryNames.get(row.categoryId) ?? 'Unknown') : 'Uncategorized',
        count: row._count,
      }))
      .sort((a, b) => b.count - a.count),
    byArea: byArea
      .map((row) => ({ name: row.area!, count: row._count }))
      .sort((a, b) => b.count - a.count),
    aiAcceptanceRate,
  }
}
