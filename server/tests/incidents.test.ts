import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/db.js'
import { categoryId, createUser, loginAs, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

async function outageReports(count: number, area = 'Mirpur') {
  const connectivity = await categoryId('Connectivity')
  const ids: number[] = []
  for (let i = 0; i < count; i++) {
    const customer = await createUser('CUSTOMER', { area })
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Internet down',
        description: `No internet connection since a few minutes, house ${i + 1}`,
        area,
        categoryId: connectivity,
        createdById: customer.id,
        dueAt: new Date(Date.now() + 4 * 3_600_000),
      },
    })
    ids.push(ticket.id)
  }
  return ids
}

describe('incidents', () => {
  it('suggests an outage and lets an admin create and resolve the incident', async () => {
    const ticketIds = await outageReports(5)
    const admin = await loginAs(await createUser('ADMIN'))

    const { body: suggestions } = await admin.get('/api/incidents/suggestions').expect(200)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ area: 'Mirpur', customerCount: 5 })

    const { body: stats } = await admin.get('/api/stats').expect(200)
    expect(stats.outageSuggestions).toBe(1)

    const { body: incident } = await admin
      .post('/api/incidents')
      .send({ area: 'Mirpur', ticketIds })
      .expect(201)
    expect(incident).toMatchObject({
      title: 'Connectivity outage in Mirpur',
      status: 'OPEN',
      fallback: true,
    })
    expect(incident.tickets).toHaveLength(5)

    const { body: after } = await admin.get('/api/incidents/suggestions').expect(200)
    expect(after).toEqual([])

    const { body: resolved } = await admin
      .post(`/api/incidents/${incident.id}/resolve`)
      .send({ resolutionNote: 'Replaced the damaged fiber line on the main road' })
      .expect(200)
    expect(resolved.resolvedTickets).toBe(5)

    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      include: { comments: true, events: true },
    })
    for (const ticket of tickets) {
      expect(ticket.status).toBe('RESOLVED')
      expect(ticket.resolutionNote).toBe('Replaced the damaged fiber line on the main road')
      expect(ticket.comments).toHaveLength(1)
      expect(ticket.events.at(-1)?.note).toBe(`Resolved with incident #${incident.id}`)
    }

    await admin
      .post(`/api/incidents/${incident.id}/resolve`)
      .send({ resolutionNote: 'again please' })
      .expect(409)
  })

  it('only lets admins create incidents and hides them from customers', async () => {
    const ticketIds = await outageReports(2)
    const agent = await loginAs(await createUser('AGENT'))
    const customer = await loginAs(await createUser('CUSTOMER'))

    await agent.get('/api/incidents').expect(200)
    await agent.post('/api/incidents').send({ area: 'Mirpur', ticketIds }).expect(403)
    await customer.get('/api/incidents').expect(403)
  })

  it('rejects tickets from another area or already linked', async () => {
    const mirpur = await outageReports(2)
    const uttara = await outageReports(1, 'Uttara')
    const admin = await loginAs(await createUser('ADMIN'))

    await admin
      .post('/api/incidents')
      .send({ area: 'Mirpur', ticketIds: [...mirpur, ...uttara] })
      .expect(409)

    const { body: incident } = await admin
      .post('/api/incidents')
      .send({ area: 'Mirpur', ticketIds: mirpur, title: 'Fiber cut near Mirpur 10' })
      .expect(201)
    expect(incident.title).toBe('Fiber cut near Mirpur 10')

    await admin.post('/api/incidents').send({ area: 'Mirpur', ticketIds: mirpur }).expect(409)
    await admin.post('/api/incidents').send({ area: 'Mirpur', ticketIds: [] }).expect(400)
  })

  it('links more tickets to an open incident', async () => {
    const [first, second] = await outageReports(2)
    const admin = await loginAs(await createUser('ADMIN'))
    const { body: incident } = await admin
      .post('/api/incidents')
      .send({ area: 'Mirpur', ticketIds: [first] })
      .expect(201)

    const { body: updated } = await admin
      .post(`/api/incidents/${incident.id}/tickets`)
      .send({ ticketIds: [second] })
      .expect(200)
    expect(updated.tickets).toHaveLength(2)
  })
})
