import { prisma } from '../db.js'
import type { Role } from '../generated/prisma/client.js'
import type { AuthUser } from '../lib/auth.js'

export async function listUsers(user: AuthUser, role?: Role) {
  // agents only need the staff list for assignment, not customer details
  const roles: Role[] = user.role === 'ADMIN' ? ['CUSTOMER', 'AGENT', 'ADMIN'] : ['AGENT', 'ADMIN']
  const users = await prisma.user.findMany({
    where: { role: role && roles.includes(role) ? role : { in: roles } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      area: true,
      createdAt: true,
      _count: {
        select: { assignedTickets: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return users.map(({ _count, ...rest }) => ({ ...rest, openTickets: _count.assignedTickets }))
}
