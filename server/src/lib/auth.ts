import type { Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import type { Role } from '../generated/prisma/client.js'

export const AUTH_COOKIE = 'token'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: Role
  area: string | null
}

type TokenPayload = { sub: string }

export function signToken(userId: number) {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: String(userId),
    expiresIn: `${config.JWT_EXPIRES_DAYS}d`,
  })
}

export function readUserId(token: string) {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as TokenPayload
    return Number(payload.sub)
  } catch {
    return null
  }
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    maxAge: config.JWT_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
  })
}
