import { Router } from 'express'
import * as replyDrafts from '../controllers/replyDraftController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { rateDraftSchema } from '../schemas/ai.js'

export const replyDraftsRouter = Router()

replyDraftsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('AGENT', 'ADMIN'),
  validateBody(rateDraftSchema),
  replyDrafts.rate,
)
