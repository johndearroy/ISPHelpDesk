import type { RequestHandler } from 'express'
import { prisma } from '../db.js'
import type { Role } from '../generated/prisma/client.js'
import { AUTH_COOKIE, readUserId } from '../lib/auth.js'
import { HttpError } from '../lib/httpError.js'

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE]
  const userId = token ? readUserId(token) : null
  if (!userId) {
    throw new HttpError(401, 'Please log in to continue')
  }

  // load the user on every request so deleted users and role changes take effect immediately
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, area: true },
  })
  if (!user) {
    throw new HttpError(401, 'Please log in to continue')
  }

  req.user = user
  next()
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'You do not have permission to do this')
    }
    next()
  }
}
