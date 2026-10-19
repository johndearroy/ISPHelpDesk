import { prisma } from '../src/db.js'

// deletes only rows flagged as demo data, real tickets keep working
export async function clearDemoData() {
  const demoUsers = await prisma.user.findMany({ where: { isDemo: true }, select: { id: true } })
  const demoUserIds = demoUsers.map((user) => user.id)

  const [
    aiEvents,
    comments,
    replyDrafts,
    summaries,
    analyses,
    ticketEvents,
    tickets,
    incidents,
    aiRequests,
    users,
  ] = await prisma.$transaction([
    prisma.aiEvent.deleteMany({
      where: { OR: [{ isDemo: true }, { userId: { in: demoUserIds } }] },
    }),
    prisma.comment.deleteMany({ where: { isDemo: true } }),
    prisma.replyDraft.deleteMany({ where: { isDemo: true } }),
    prisma.ticketSummary.deleteMany({ where: { isDemo: true } }),
    prisma.ticketAnalysis.deleteMany({ where: { isDemo: true } }),
    prisma.ticketEvent.deleteMany({ where: { isDemo: true } }),
    prisma.ticket.deleteMany({ where: { isDemo: true } }),
    prisma.incident.deleteMany({ where: { isDemo: true } }),
    prisma.aiRequest.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.user.deleteMany({ where: { isDemo: true } }),
  ])

  return {
    ai_events: aiEvents.count,
    comments: comments.count,
    reply_drafts: replyDrafts.count,
    ticket_summaries: summaries.count,
    ticket_analyses: analyses.count,
    ticket_events: ticketEvents.count,
    tickets: tickets.count,
    incidents: incidents.count,
    ai_requests: aiRequests.count,
    users: users.count,
  }
}
