import type { Request, Response } from 'express'
import { clearAuthCookie, setAuthCookie, signToken } from '../lib/auth.js'
import * as authService from '../services/authService.js'

export async function register(req: Request, res: Response) {
  const user = await authService.register(req.body)
  setAuthCookie(res, signToken(user.id))
  res.status(201).json({ user })
}

export async function login(req: Request, res: Response) {
  const user = await authService.login(req.body)
  setAuthCookie(res, signToken(user.id))
  res.json({ user })
}

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res)
  res.status(204).end()
}

export function me(req: Request, res: Response) {
  res.json({ user: req.user })
}
