import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { prisma } from '../src/db.js'
import { categoryId, createUser, loginAs, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

const newTicket = {
  title: 'Internet not working',
  description: 'No internet since this morning, router lights are red.',
}

async function setup() {
  const customer = await createUser('CUSTOMER', { area: 'Uttara' })
  const otherCustomer = await createUser('CUSTOMER')
  const agent = await createUser('AGENT')
  const otherAgent = await createUser('AGENT')
  const admin = await createUser('ADMIN')
  return { customer, otherCustomer, agent, otherAgent, admin }
}

describe('tickets', () => {
  it('creates a ticket with a medium priority sla and a history entry', async () => {
    const { customer } = await setup()
    const client = await loginAs(customer)

    const res = await client.post('/api/tickets').send(newTicket).expect(201)
    expect(res.body).toMatchObject({ status: 'OPEN', priority: 'MEDIUM', area: 'Uttara' })

    const hours =
      (new Date(res.body.dueAt).getTime() - new Date(res.body.createdAt).getTime()) / 3_600_000
    expect(hours).toBe(48)
    expect(await prisma.ticketEvent.count({ where: { ticketId: res.body.id } })).toBe(1)
  })

  it('rejects invalid ticket input', async () => {
    const { customer } = await setup()
    const client = await loginAs(customer)

    const res = await client.post('/api/tickets').send({ title: 'Hi', description: '' }).expect(400)
    expect(res.body.error.details).toHaveProperty('title')
    expect(res.body.error.details).toHaveProperty('description')
  })

  it('hides tickets from other customers', async () => {
    const { customer, otherCustomer } = await setup()
    const created = await (await loginAs(customer)).post('/api/tickets').send(newTicket)

    const other = await loginAs(otherCustomer)
    await other.get(`/api/tickets/${created.body.id}`).expect(404)
    const list = await other.get('/api/tickets').expect(200)
    expect(list.body.total).toBe(0)
  })

  it('shows agents unassigned tickets and their own, but not other agents tickets', async () => {
    const { customer, agent, otherAgent } = await setup()
    const client = await loginAs(customer)
    const first = await client.post('/api/tickets').send(newTicket)
    await client.post('/api/tickets').send({ ...newTicket, title: 'Second problem here' })

    await (await loginAs(otherAgent)).post(`/api/tickets/${first.body.id}/assign`).send({
      assigneeId: otherAgent.id,
    })

    const list = await (await loginAs(agent)).get('/api/tickets').expect(200)
    expect(list.body.items.map((t: { title: string }) => t.title)).toEqual(['Second problem here'])
  })

  it('runs the full workflow and logs every status change', async () => {
    const { customer, agent } = await setup()
    const customerClient = await loginAs(customer)
    const agentClient = await loginAs(agent)
    const { body: ticket } = await customerClient.post('/api/tickets').send(newTicket)

    const started = await agentClient
      .post(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200)
    expect(started.body.assignedTo.id).toBe(agent.id)

    const resolved = await agentClient
      .post(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'RESOLVED', resolutionNote: 'Replaced the fiber patch cord' })
      .expect(200)
    expect(resolved.body.resolvedAt).not.toBeNull()

    await customerClient
      .post(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'CLOSED' })
      .expect(200)

    const events = await prisma.ticketEvent.findMany({ where: { ticketId: ticket.id } })
    expect(events.map((e) => e.toStatus)).toEqual(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])

    await customerClient
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ body: 'thanks' })
      .expect(409)
  })

  it('returns 409 for an invalid transition', async () => {
    const { customer, agent } = await setup()
    const { body: ticket } = await (await loginAs(customer)).post('/api/tickets').send(newTicket)

    const res = await (
      await loginAs(agent)
    )
      .post(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'CLOSED' })
      .expect(409)
    expect(res.body.error.message).toBe('A ticket cannot move from open to closed')
  })

  it('requires a resolution note to resolve', async () => {
    const { customer, agent } = await setup()
    const { body: ticket } = await (await loginAs(customer)).post('/api/tickets').send(newTicket)
    const agentClient = await loginAs(agent)
    await agentClient.post(`/api/tickets/${ticket.id}/status`).send({ status: 'IN_PROGRESS' })

    await agentClient
      .post(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'RESOLVED' })
      .expect(400)
  })

  it('does not let customers move their own ticket forward', async () => {
    const { customer } = await setup()
    const client = await loginAs(customer)
    const { body: ticket } = await client.post('/api/tickets').send(newTicket)

    await client
      .post(`/api/tickets/${ticket.id}/status`)
      .send({ status: 'IN_PROGRESS' })
      .expect(403)
  })

  it('recalculates the due date when priority changes', async () => {
    const { customer, agent } = await setup()
    const { body: ticket } = await (await loginAs(customer)).post('/api/tickets').send(newTicket)

    const res = await (
      await loginAs(agent)
    )
      .patch(`/api/tickets/${ticket.id}`)
      .send({ priority: 'URGENT', categoryId: await categoryId('Connectivity') })
      .expect(200)

    const hours =
      (new Date(res.body.dueAt).getTime() - new Date(res.body.createdAt).getTime()) / 3_600_000
    expect(hours).toBe(4)
    expect(res.body.category.name).toBe('Connectivity')
  })

  it('does not let customers change priority', async () => {
    const { customer } = await setup()
    const client = await loginAs(customer)
    const { body: ticket } = await client.post('/api/tickets').send(newTicket)

    await client.patch(`/api/tickets/${ticket.id}`).send({ priority: 'URGENT' }).expect(403)
  })

  it('only lets agents assign tickets to themselves', async () => {
    const { customer, agent, otherAgent, admin } = await setup()
    const { body: ticket } = await (await loginAs(customer)).post('/api/tickets').send(newTicket)

    await (
      await loginAs(agent)
    )
      .post(`/api/tickets/${ticket.id}/assign`)
      .send({ assigneeId: otherAgent.id })
      .expect(403)
    await (
      await loginAs(customer)
    )
      .post(`/api/tickets/${ticket.id}/assign`)
      .send({ assigneeId: agent.id })
      .expect(403)

    const res = await (
      await loginAs(admin)
    )
      .post(`/api/tickets/${ticket.id}/assign`)
      .send({ assigneeId: otherAgent.id })
      .expect(200)
    expect(res.body.assignedTo.id).toBe(otherAgent.id)
  })

  it('filters by overdue and search', async () => {
    const { customer, admin } = await setup()
    const client = await loginAs(customer)
    const { body: ticket } = await client.post('/api/tickets').send(newTicket)
    await client.post('/api/tickets').send({ ...newTicket, title: 'Bill charged twice' })
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { dueAt: new Date(Date.now() - 1000) },
    })

    const adminClient = await loginAs(admin)
    const overdue = await adminClient.get('/api/tickets?overdue=true').expect(200)
    expect(overdue.body.items).toHaveLength(1)
    expect(overdue.body.items[0].isOverdue).toBe(true)

    const search = await adminClient.get('/api/tickets?search=bill').expect(200)
    expect(search.body.items[0].title).toBe('Bill charged twice')

    await adminClient.get('/api/tickets?status=DONE').expect(400)
  })
})

describe('categories and stats', () => {
  it('only lets admins manage categories', async () => {
    const { customer, admin } = await setup()

    await (await loginAs(customer)).post('/api/categories').send({ name: 'Other' }).expect(403)
    await (await loginAs(admin)).post('/api/categories').send({ name: 'Other' }).expect(201)
    await (await loginAs(admin)).post('/api/categories').send({ name: 'Other' }).expect(409)
  })

  it('counts tickets by status for the dashboard', async () => {
    const { customer, admin } = await setup()
    const client = await loginAs(customer)
    await client.post('/api/tickets').send(newTicket)
    await client.post('/api/tickets').send(newTicket)

    const res = await (await loginAs(admin)).get('/api/stats').expect(200)
    expect(res.body.statusCounts.OPEN).toBe(2)
    expect(res.body.total).toBe(2)
    expect(res.body.byArea).toEqual([{ name: 'Uttara', count: 2 }])
  })
})
