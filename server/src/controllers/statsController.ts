import type { Request, Response } from 'express'
import * as statsService from '../services/statsService.js'

export async function show(req: Request, res: Response) {
  res.json(await statsService.getStats(req.user))
}
