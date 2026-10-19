import type { Request, Response } from 'express'
import { usageQuerySchema } from '../schemas/ai.js'
import { getAiUsage } from '../services/aiUsageService.js'
import * as similarService from '../services/similarService.js'
import { triageText } from '../services/triageService.js'

export async function triagePreview(req: Request, res: Response) {
  const triage = await triageText(req.body, req.user.id)
  res.json({
    category: triage.category,
    priority: triage.priority,
    sentiment: triage.sentiment,
    language: triage.language,
    summary: triage.summary,
    reason: triage.reason,
    ruleRaisedPriority: triage.ruleRaisedPriority,
    model: triage.model,
    fallback: triage.model === null,
  })
}

export async function similar(req: Request, res: Response) {
  res.json(await similarService.checkNewTicket(req.user, req.body))
}

export async function deflection(req: Request, res: Response) {
  await similarService.recordDeflection(req.user, req.body.matchedTicketId)
  res.status(201).json({ recorded: true })
}

export async function usage(req: Request, res: Response) {
  const { days } = usageQuerySchema.parse(req.query)
  res.json(await getAiUsage(days))
}
