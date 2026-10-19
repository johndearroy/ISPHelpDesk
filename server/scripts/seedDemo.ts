import bcrypt from 'bcrypt'
import { firstSentence } from '../src/ai/local/text.js'
import { config } from '../src/config.js'
import { prisma } from '../src/db.js'
import type { AiFeature, TicketStatus, User } from '../src/generated/prisma/client.js'
import { editRatio } from '../src/lib/editRatio.js'
import { SLA_HOURS, calculateDueAt } from '../src/lib/ticketRules.js'
import { clearDemoData } from './demoCleanup.js'
import {
  DEMO_PASSWORD,
  type DemoTicket,
  demoCustomers,
  demoRequestModels,
  demoStaff,
  demoTickets,
  incidentReports,
} from './demoData.js'

const HOUR = 60 * 60 * 1000
const TICKET_COUNT = 50
const now = Date.now()

// seeded random numbers so every run produces the same demo data
let seed = 42
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]
const between = (min: number, max: number) => min + random() * (max - min)

const models = config.OPENROUTER_MODELS.length ? config.OPENROUTER_MODELS : demoRequestModels

async function logRequests(feature: AiFeature, userId: number, at: Date, fallback = false) {
  const rows = []
  if (fallback) {
    for (const model of models) {
      rows.push({ model, status: 'FAILED' as const, errorCode: 'rate_limited', latencyMs: 300 })
    }
    rows.push({
      model: null,
      status: 'FALLBACK' as const,
      errorCode: 'all_models_failed',
      latencyMs: 0,
    })
  } else {
    if (random() < 0.15) {
      rows.push({
        model: models[0],
        status: 'FAILED' as const,
        errorCode: pick(['rate_limited', 'invalid_json', 'timeout']),
        latencyMs: Math.round(between(200, 1500)),
      })
    }
    rows.push({
      model: rows.length && models[1] ? models[1] : models[0],
      status: 'SUCCESS' as const,
      errorCode: null,
      latencyMs: Math.round(between(700, 4200)),
      promptTokens: Math.round(between(350, 900)),
      completionTokens: Math.round(between(60, 220)),
    })
  }

  await prisma.aiRequest.createMany({
    data: rows.map((row, index) => ({
      feature,
      userId,
      createdAt: new Date(at.getTime() + index * 2000),
      ...row,
    })),
  })
  return rows.at(-1)!.model
}

async function createUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const staff: User[] = []
  for (const member of demoStaff) {
    staff.push(await prisma.user.create({ data: { ...member, passwordHash, isDemo: true } }))
  }
  const customers: User[] = []
  for (const customer of demoCustomers) {
    customers.push(
      await prisma.user.create({
        data: { ...customer, passwordHash, role: 'CUSTOMER', isDemo: true },
      }),
    )
  }
  return { admin: staff[0], agents: staff.slice(1), customers }
}

function pickStatus(template: DemoTicket, ageHours: number): TicketStatus {
  if (!template.resolution) return random() < 0.5 ? 'IN_PROGRESS' : 'OPEN'
  if (ageHours > 30) return random() < 0.45 ? 'CLOSED' : 'RESOLVED'
  if (ageHours > 6 && random() < 0.5) return 'RESOLVED'
  return random() < 0.5 ? 'IN_PROGRESS' : 'OPEN'
}

async function createTicket(
  template: DemoTicket,
  customer: User,
  agents: User[],
  categories: Map<string, number>,
  index: number,
) {
  // tickets without a known fix are recent and still being worked on
  const ageHours = template.resolution ? between(2, 30 * 24) : between(1, 4 * 24)
  const createdAt = new Date(now - ageHours * HOUR)
  let status = pickStatus(template, ageHours)
  const agent = pick(agents)

  const startedAt = new Date(createdAt.getTime() + between(0.2, 2) * HOUR)
  let resolvedAt: Date | null = null
  if (status === 'RESOLVED' || status === 'CLOSED') {
    // some fixes take longer than the sla so the dashboard has real numbers
    resolvedAt = new Date(
      createdAt.getTime() + SLA_HOURS[template.priority] * between(0.3, 1.3) * HOUR,
    )
    if (resolvedAt.getTime() > now) {
      status = 'IN_PROGRESS'
      resolvedAt = null
    }
  }
  const closedAt = resolvedAt ? new Date(resolvedAt.getTime() + between(2, 20) * HOUR) : null
  if (status === 'CLOSED' && closedAt && closedAt.getTime() > now) status = 'RESOLVED'

  const assigned = status !== 'OPEN' || random() < 0.3
  const ticket = await prisma.ticket.create({
    data: {
      title: template.title,
      description: template.description,
      status,
      priority: template.priority,
      area: customer.area,
      categoryId: categories.get(template.category),
      createdById: customer.id,
      assignedToId: assigned ? agent.id : null,
      dueAt: calculateDueAt(template.priority, createdAt),
      resolvedAt,
      resolutionNote: resolvedAt ? template.resolution : null,
      createdAt,
      isDemo: true,
    },
  })

  const events: {
    fromStatus: TicketStatus | null
    toStatus: TicketStatus
    actorId: number
    createdAt: Date
    note?: string
  }[] = [
    { fromStatus: null, toStatus: 'OPEN', actorId: customer.id, createdAt, note: 'Ticket created' },
  ]
  if (status !== 'OPEN') {
    events.push({
      fromStatus: 'OPEN',
      toStatus: 'IN_PROGRESS',
      actorId: agent.id,
      createdAt: startedAt,
    })
  }
  if (resolvedAt) {
    events.push({
      fromStatus: 'IN_PROGRESS',
      toStatus: 'RESOLVED',
      actorId: agent.id,
      createdAt: resolvedAt,
    })
  }
  if (status === 'CLOSED' && closedAt) {
    events.push({
      fromStatus: 'RESOLVED',
      toStatus: 'CLOSED',
      actorId: customer.id,
      createdAt: closedAt,
    })
  }
  await prisma.ticketEvent.createMany({
    data: events.map((event) => ({ ...event, ticketId: ticket.id, isDemo: true })),
  })

  const thread = status === 'OPEN' ? [] : [...(template.thread ?? [])]
  if (resolvedAt && template.resolution) {
    thread.push([
      'agent',
      `This is fixed now. ${template.resolution} Let us know if anything is still not right.`,
    ])
  }
  const threadEnd = resolvedAt?.getTime() ?? now
  const step = (threadEnd - startedAt.getTime()) / (thread.length + 1)

  const fallback = index % 7 === 3
  const analysisModel = await logRequests(
    'TRIAGE',
    customer.id,
    new Date(createdAt.getTime() + 3000),
    fallback,
  )
  const reviewed = status !== 'OPEN' && random() < 0.85
  await prisma.ticketAnalysis.create({
    data: {
      ticketId: ticket.id,
      status: fallback ? 'FALLBACK' : 'DONE',
      categoryId: categories.get(template.aiGuess ?? template.category),
      priority: template.priority,
      sentiment: template.sentiment,
      language: template.language,
      summary: firstSentence(template.description),
      reason: fallback
        ? 'Keyword match based on the ticket text'
        : `Reported problem fits ${template.aiGuess ?? template.category} with ${template.priority.toLowerCase()} impact`,
      model: analysisModel,
      finalCategoryId: reviewed ? categories.get(template.category) : null,
      finalPriority: reviewed ? template.priority : null,
      reviewedById: reviewed ? agent.id : null,
      reviewedAt: reviewed ? startedAt : null,
      isDemo: true,
      createdAt,
    },
  })

  let commentCount = 0
  for (const [position, [who, body]] of thread.entries()) {
    const at = new Date(startedAt.getTime() + step * (position + 1))
    const fromAgent = who === 'agent'
    let replyDraftId: number | null = null

    // a few agent replies started as ai drafts that the agent then edited
    if (fromAgent && random() < 0.4) {
      const draftBody = `Hi ${customer.name.split(' ')[0]}, ${body.charAt(0).toLowerCase()}${body.slice(1)} Thanks for your patience.`
      const model = await logRequests('REPLY_DRAFT', agent.id, new Date(at.getTime() - 60_000))
      const draft = await prisma.replyDraft.create({
        data: {
          ticketId: ticket.id,
          requestedById: agent.id,
          body: draftBody,
          model,
          rating: pick([1, 1, 1, null, -1]),
          sentBody: body,
          editRatio: editRatio(draftBody, body),
          isDemo: true,
          createdAt: new Date(at.getTime() - 60_000),
        },
      })
      replyDraftId = draft.id
    }

    await prisma.comment.create({
      data: {
        ticketId: ticket.id,
        authorId: fromAgent ? agent.id : customer.id,
        body,
        replyDraftId,
        isDemo: true,
        createdAt: at,
      },
    })
    commentCount += 1
  }

  if (template.summary && commentCount >= 6) {
    const model = await logRequests('SUMMARY', agent.id, new Date(threadEnd))
    await prisma.ticketSummary.create({
      data: {
        ticketId: ticket.id,
        body: JSON.stringify(template.summary),
        commentCount,
        model,
        isDemo: true,
      },
    })
  }

  return ticket
}

async function createPastIncident(admin: User, customers: User[], connectivityId: number) {
  const area = 'Dhanmondi'
  const reporters = customers.filter((customer) => customer.area === area)
  const startedAt = new Date(now - 9 * 24 * HOUR)
  const resolvedAt = new Date(startedAt.getTime() + 3 * HOUR)
  const resolutionNote =
    'A fiber trunk line was cut during road work on Satmasjid Road. The cable was spliced and all lines are back.'

  const incident = await prisma.incident.create({
    data: {
      title: 'Connectivity outage in Dhanmondi',
      area,
      summary:
        'Several customers in Dhanmondi lost their internet connection within a few minutes in the evening. Reports describe a complete loss of connection with normal router lights.',
      status: 'RESOLVED',
      createdById: admin.id,
      resolvedById: admin.id,
      resolvedAt,
      resolutionNote,
      isDemo: true,
      createdAt: new Date(startedAt.getTime() + 40 * 60_000),
    },
  })
  await logRequests('INCIDENT', admin.id, incident.createdAt)

  for (const [index, report] of incidentReports.entries()) {
    const customer = reporters[index % reporters.length]
    const createdAt = new Date(startedAt.getTime() + index * 6 * 60_000)
    await prisma.ticket.create({
      data: {
        title: firstSentence(report, 60),
        description: report,
        status: 'RESOLVED',
        priority: 'HIGH',
        area,
        categoryId: connectivityId,
        createdById: customer.id,
        incidentId: incident.id,
        dueAt: calculateDueAt('HIGH', createdAt),
        resolvedAt,
        resolutionNote,
        createdAt,
        isDemo: true,
        events: {
          create: [
            {
              toStatus: 'OPEN',
              actorId: customer.id,
              note: 'Ticket created',
              createdAt,
              isDemo: true,
            },
            {
              fromStatus: 'OPEN',
              toStatus: 'OPEN',
              actorId: admin.id,
              note: `Linked to incident #${incident.id}`,
              createdAt: incident.createdAt,
              isDemo: true,
            },
            {
              fromStatus: 'OPEN',
              toStatus: 'RESOLVED',
              actorId: admin.id,
              note: `Resolved with incident #${incident.id}`,
              createdAt: resolvedAt,
              isDemo: true,
            },
          ],
        },
        comments: {
          create: {
            authorId: admin.id,
            body: `This was part of a network problem in ${area} that affected several customers. It has now been fixed: ${resolutionNote}`,
            createdAt: resolvedAt,
            isDemo: true,
          },
        },
        analysis: {
          create: {
            status: 'DONE',
            categoryId: connectivityId,
            priority: 'HIGH',
            sentiment: 'NEGATIVE',
            language: index === 1 ? 'BANGLISH' : 'ENGLISH',
            summary: firstSentence(report),
            reason: 'Complete loss of connection reported',
            model: models[0],
            isDemo: true,
            createdAt,
          },
        },
      },
    })
  }
}

async function createAiEvents(customers: User[]) {
  const solved = await prisma.ticket.findMany({
    where: { isDemo: true, status: { in: ['RESOLVED', 'CLOSED'] } },
    select: { id: true },
    take: 10,
  })
  const events = []
  for (let i = 0; i < 6 && solved.length; i++) {
    events.push({
      type: 'DEFLECTED' as const,
      userId: pick(customers).id,
      matchedTicketId: pick(solved).id,
      createdAt: new Date(now - between(1, 25 * 24) * HOUR),
      isDemo: true,
    })
  }
  for (let i = 0; i < 3 && solved.length; i++) {
    events.push({
      type: 'DUPLICATE_WARNED' as const,
      userId: pick(customers).id,
      matchedTicketId: pick(solved).id,
      createdAt: new Date(now - between(1, 25 * 24) * HOUR),
      isDemo: true,
    })
  }
  await prisma.aiEvent.createMany({ data: events })
}

const categoryRows = await prisma.category.findMany()
if (!categoryRows.length) {
  console.error('No categories found. Run "npm run seed" first.')
  process.exit(1)
}
const categories = new Map(categoryRows.map((category) => [category.name, category.id]))

const removed = await clearDemoData()
if (removed.users) console.info(`Removed previous demo data (${removed.tickets} tickets)`)

const { admin, agents, customers } = await createUsers()
for (let index = 0; index < TICKET_COUNT; index++) {
  const template = demoTickets[index % demoTickets.length]
  await createTicket(template, customers[(index * 3) % customers.length], agents, categories, index)
}
await createPastIncident(admin, customers, categories.get('Connectivity')!)
await createAiEvents(customers)

const ticketCount = await prisma.ticket.count({ where: { isDemo: true } })
console.info(
  `Demo data ready: ${demoStaff.length + demoCustomers.length} users, ${ticketCount} tickets`,
)
console.info(`Log in with any @demo.local account, password: ${DEMO_PASSWORD}`)
await prisma.$disconnect()
