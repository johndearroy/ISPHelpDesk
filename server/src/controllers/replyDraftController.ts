import type { Request, Response } from 'express'
import { parseId } from '../lib/params.js'
import { rateDraft } from '../services/replyDraftService.js'

export async function rate(req: Request, res: Response) {
  res.json(await rateDraft(req.user, parseId(req.params.id), req.body.rating))
}
