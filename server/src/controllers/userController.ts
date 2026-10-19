import type { Request, Response } from 'express'
import { z } from 'zod'
import { Role } from '../generated/prisma/client.js'
import * as userService from '../services/userService.js'

const querySchema = z.object({ role: z.enum(Role).optional() })

export async function list(req: Request, res: Response) {
  const { role } = querySchema.parse(req.query)
  res.json(await userService.listUsers(req.user, role))
}
