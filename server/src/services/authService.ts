import bcrypt from 'bcrypt'
import { prisma } from '../db.js'
import { HttpError } from '../lib/httpError.js'
import type { LoginInput, RegisterInput } from '../schemas/auth.js'

const publicFields = { id: true, name: true, email: true, role: true, area: true } as const

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    throw new HttpError(409, 'An account with this email already exists', {
      email: ['An account with this email already exists'],
    })
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      area: input.area,
      passwordHash,
      role: 'CUSTOMER',
    },
    select: publicFields,
  })
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false
  if (!user || !valid) {
    throw new HttpError(401, 'Invalid email or password')
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role, area: user.area }
}
