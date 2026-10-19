import { Router } from 'express'
import * as tickets from '../controllers/ticketController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimits.js'
import { validateBody } from '../middleware/validate.js'
import { reviewAnalysisSchema } from '../schemas/ai.js'
import {
  assignTicketSchema,
  changeStatusSchema,
  commentSchema,
  createTicketSchema,
  updateTicketSchema,
} from '../schemas/ticket.js'

export const ticketsRouter = Router()

const staffOnly = requireRole('AGENT', 'ADMIN')

ticketsRouter.use(requireAuth)

ticketsRouter.get('/', tickets.list)
ticketsRouter.post('/', validateBody(createTicketSchema), tickets.create)
ticketsRouter.get('/:id', tickets.show)
ticketsRouter.patch('/:id', validateBody(updateTicketSchema), tickets.update)
ticketsRouter.delete('/:id', tickets.remove)
ticketsRouter.post('/:id/status', validateBody(changeStatusSchema), tickets.changeStatus)
ticketsRouter.post('/:id/assign', staffOnly, validateBody(assignTicketSchema), tickets.assign)
ticketsRouter.get('/:id/comments', tickets.listComments)
ticketsRouter.post('/:id/comments', validateBody(commentSchema), tickets.addComment)

ticketsRouter.get('/:id/analysis', staffOnly, tickets.showAnalysis)
ticketsRouter.post(
  '/:id/analysis/review',
  staffOnly,
  validateBody(reviewAnalysisSchema),
  tickets.reviewAnalysis,
)
ticketsRouter.post('/:id/analysis/retry', staffOnly, aiLimiter, tickets.retryAnalysis)
ticketsRouter.post('/:id/reply-drafts', staffOnly, aiLimiter, tickets.createReplyDraft)
ticketsRouter.get('/:id/summary', staffOnly, aiLimiter, tickets.showSummary)
ticketsRouter.get('/:id/similar', staffOnly, tickets.listSimilar)
