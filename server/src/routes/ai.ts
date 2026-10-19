import { Router } from 'express'
import * as ai from '../controllers/aiController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimits.js'
import { validateBody } from '../middleware/validate.js'
import { deflectionSchema } from '../schemas/ai.js'
import { createTicketSchema } from '../schemas/ticket.js'

export const aiRouter = Router()

aiRouter.use(requireAuth)

aiRouter.post('/triage-preview', aiLimiter, validateBody(createTicketSchema), ai.triagePreview)
aiRouter.post('/similar', validateBody(createTicketSchema), ai.similar)
aiRouter.post('/deflections', validateBody(deflectionSchema), ai.deflection)
aiRouter.get('/usage', requireRole('ADMIN'), ai.usage)
