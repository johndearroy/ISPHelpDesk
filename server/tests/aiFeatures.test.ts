import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { prisma } from '../src/db.js'
import { waitForAnalyses } from '../src/services/triageService.js'
import { categoryId, createUser, loginAs, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

async function createTicket(client: request.Agent, title: string, description: string) {
  const res = await client.post('/api/tickets').send({ title, description }).expect(201)
  await waitForAnalyses()
  return res.body
}

async function resolvedTicket(title: string, description: string, resolutionNote: string) {
  const customer = await createUser('CUSTOMER')
  return prisma.ticket.create({
    data: {
      title,
      description,
      createdById: customer.id,
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNote,
      dueAt: new Date(),
    },
  })
}

describe('ticket triage', () => {
  it('analyzes new tickets in the background and fills category and priority', async () => {
    const customer = await createUser()
    const ticket = await createTicket(
      await loginAs(customer),
      'Internet not working',
      'No internet since morning, the connection keeps dropping.',
    )

    const analysis = await prisma.ticketAnalysis.findUniqueOrThrow({
      where: { ticketId: ticket.id },
    })
    expect(analysis).toMatchObject({
      status: 'FALLBACK',
      priority: 'HIGH',
      ruleRaisedPriority: true,
    })

    const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })
    expect(saved.categoryId).toBe(await categoryId('Connectivity'))
    expect(saved.priority).toBe('HIGH')
    expect((saved.dueAt.getTime() - saved.createdAt.getTime()) / 3_600_000).toBe(24)

    const log = await prisma.aiRequest.findFirstOrThrow()
    expect(log).toMatchObject({ feature: 'TRIAGE', status: 'FALLBACK', errorCode: 'no_api_key' })
  })

  it('keeps the analysis away from customers', async () => {
    const customer = await createUser()
    const client = await loginAs(customer)
    const ticket = await createTicket(client, 'Bill problem', 'I was charged twice this month.')

    await client.get(`/api/tickets/${ticket.id}/analysis`).expect(403)
    const detail = await client.get(`/api/tickets/${ticket.id}`).expect(200)
    expect(detail.body.analysis).toBeUndefined()
  })

  it('records accepted and overridden suggestions', async () => {
    const customer = await createUser()
    const agent = await createUser('AGENT')
    const ticket = await createTicket(
      await loginAs(customer),
      'Router light is red',
      'The router shows a red LOS light and there is no internet.',
    )
    const agentClient = await loginAs(agent)
    const { body: analysis } = await agentClient
      .get(`/api/tickets/${ticket.id}/analysis`)
      .expect(200)

    const hardware = await categoryId('Hardware')
    await agentClient
      .post(`/api/tickets/${ticket.id}/analysis/review`)
      .send({ categoryId: hardware, priority: 'URGENT' })
      .expect(200)

    const saved = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: { events: true },
    })
    expect(saved).toMatchObject({ categoryId: hardware, priority: 'URGENT' })
    expect(saved.events.at(-1)?.note).toContain('AI suggestion changed')
    expect(analysis.categoryId).not.toBeNull()

    const stats = await agentClient.get('/api/stats').expect(200)
    expect(stats.body.aiAcceptanceRate).toBe(0)
  })

  it('can run a fallback analysis again', async () => {
    const customer = await createUser()
    const admin = await createUser('ADMIN')
    const ticket = await createTicket(
      await loginAs(customer),
      'Slow speed',
      'Speed is very slow at night.',
    )

    const res = await (
      await loginAs(admin)
    )
      .post(`/api/tickets/${ticket.id}/analysis/retry`)
      .expect(202)
    expect(res.body.status).toBe('PENDING')
    await waitForAnalyses()
  })

  it('previews a suggestion for the new ticket form', async () => {
    const customer = await createUser()
    const res = await (
      await loginAs(customer)
    )
      .post('/api/ai/triage-preview')
      .send({ title: 'Need a new connection', description: 'I want a new connection for my shop.' })
      .expect(200)

    expect(res.body).toMatchObject({ category: { name: 'New Connection' }, fallback: true })
  })
})

describe('similar tickets', () => {
  it('suggests similar resolved tickets and warns about duplicates', async () => {
    await resolvedTicket(
      'Router red light no internet',
      'The router has a red light and internet is gone',
      'Fiber cable was loose, reconnected it at the box. Call 01712345678 if it happens again',
    )
    await resolvedTicket(
      'Bill paid twice',
      'Charged twice through bkash',
      'Refunded the extra payment',
    )

    const customer = await createUser()
    const client = await loginAs(customer)
    const first = await client
      .post('/api/ai/similar')
      .send({
        title: 'Red light on router',
        description: 'No internet and the router light is red',
      })
      .expect(200)

    expect(first.body.similar[0].title).toBe('Router red light no internet')
    expect(first.body.similar[0].resolutionNote).toContain('[phone]')
    expect(first.body.duplicate).toBeNull()

    await createTicket(client, 'Red light on router', 'No internet and the router light is red')
    const second = await client
      .post('/api/ai/similar')
      .send({ title: 'Router red light', description: 'Router light is red, no internet' })
      .expect(200)
    expect(second.body.duplicate).not.toBeNull()
    expect(await prisma.aiEvent.count({ where: { type: 'DUPLICATE_WARNED' } })).toBe(1)
  })

  it('records a deflection', async () => {
    const resolved = await resolvedTicket('Slow wifi', 'Wifi is slow', 'Changed the wifi channel')
    const client = await loginAs(await createUser())

    await client.post('/api/ai/deflections').send({ matchedTicketId: resolved.id }).expect(201)
    await client.post('/api/ai/deflections').send({ matchedTicketId: 9999 }).expect(404)
    expect(await prisma.aiEvent.count({ where: { type: 'DEFLECTED' } })).toBe(1)
  })
})

describe('reply drafts', () => {
  it('drafts a reply and measures how much the agent edited it', async () => {
    const customer = await createUser('CUSTOMER', { name: 'Nusrat Jahan' })
    const agent = await createUser('AGENT', { name: 'Rahim Uddin' })
    const ticket = await createTicket(
      await loginAs(customer),
      'Slow internet',
      'Internet is slow at night.',
    )
    const agentClient = await loginAs(agent)

    const { body: draft } = await agentClient
      .post(`/api/tickets/${ticket.id}/reply-drafts`)
      .expect(201)
    expect(draft.fallback).toBe(true)
    expect(draft.body).toContain('Hi Nusrat')
    expect(draft.body).toContain('Rahim Uddin')

    await agentClient
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ body: `${draft.body}\nWe will call you today.`, replyDraftId: draft.id })
      .expect(201)

    const saved = await prisma.replyDraft.findUniqueOrThrow({ where: { id: draft.id } })
    expect(saved.editRatio).toBeGreaterThan(0)
    expect(saved.editRatio).toBeLessThan(0.5)

    await agentClient
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ body: 'again', replyDraftId: draft.id })
      .expect(400)

    await agentClient.patch(`/api/reply-drafts/${draft.id}`).send({ rating: 1 }).expect(200)
    await agentClient.patch(`/api/reply-drafts/${draft.id}`).send({ rating: 5 }).expect(400)
  })
})

describe('thread summary', () => {
  it('summarizes long conversations and reuses the stored summary', async () => {
    const customer = await createUser()
    const agent = await createUser('AGENT')
    const ticket = await createTicket(
      await loginAs(customer),
      'Disconnects',
      'Connection drops every hour.',
    )
    const agentClient = await loginAs(agent)

    const short = await agentClient.get(`/api/tickets/${ticket.id}/summary`).expect(200)
    expect(short.body).toMatchObject({ available: false, minComments: 6 })

    for (let i = 1; i <= 6; i++) {
      await agentClient
        .post(`/api/tickets/${ticket.id}/comments`)
        .send({ body: `Update number ${i}.` })
    }

    const first = await agentClient.get(`/api/tickets/${ticket.id}/summary`).expect(200)
    expect(first.body).toMatchObject({ available: true, commentCount: 6, model: null })
    expect(first.body.issue).toBe('Connection drops every hour.')

    const second = await agentClient.get(`/api/tickets/${ticket.id}/summary`).expect(200)
    expect(second.body.updatedAt).toBe(first.body.updatedAt)
  })
})

describe('ai usage', () => {
  it('is admin only and counts fallbacks', async () => {
    const customer = await createUser()
    await createTicket(await loginAs(customer), 'Net nai', 'Net nai 2 din dhore, kaj korche na')

    await (await loginAs(await createUser('AGENT'))).get('/api/ai/usage').expect(403)
    const res = await (await loginAs(await createUser('ADMIN'))).get('/api/ai/usage').expect(200)
    expect(res.body.totals).toMatchObject({ requests: 1, fallback: 1, fallbackRate: 100 })
    expect(res.body.fallbackReasons).toEqual({ no_api_key: 1 })
  })
})
