import bcrypt from 'bcrypt'
import request from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/db.js'
import type { Role } from '../src/generated/prisma/client.js'
import { waitForAnalyses } from '../src/services/triageService.js'

export const PASSWORD = 'secret123'

const categoryNames = [
  'Connectivity',
  'Billing',
  'Hardware',
  'Account & Login',
  'New Connection',
  'General Inquiry',
]

export async function resetDatabase() {
  await waitForAnalyses()
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, categories, tickets, incidents, ai_requests, ai_events RESTART IDENTITY CASCADE',
  )
  await prisma.category.createMany({ data: categoryNames.map((name) => ({ name })) })
}

let userCount = 0

export async function createUser(
  role: Role = 'CUSTOMER',
  data: { area?: string; name?: string } = {},
) {
  userCount += 1
  return prisma.user.create({
    data: {
      name: data.name ?? `${role.toLowerCase()} ${userCount}`,
      email: `${role.toLowerCase()}${userCount}@test.local`,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role,
      area: data.area ?? (role === 'CUSTOMER' ? 'Mirpur' : null),
    },
  })
}

export async function loginAs(user: { email: string }) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(200)
  return agent
}

export async function categoryId(name: string) {
  const category = await prisma.category.findUniqueOrThrow({ where: { name } })
  return category.id
}
