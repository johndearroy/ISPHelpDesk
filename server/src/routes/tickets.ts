import { Router } from 'express'
import * as tickets from '../controllers/ticketController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import {
  assignTicketSchema,
  changeStatusSchema,
  commentSchema,
  createTicketSchema,
  updateTicketSchema,
} from '../schemas/ticket.js'

export const ticketsRouter = Router()

ticketsRouter.use(requireAuth)

ticketsRouter.get('/', tickets.list)
ticketsRouter.post('/', validateBody(createTicketSchema), tickets.create)
ticketsRouter.get('/:id', tickets.show)
ticketsRouter.patch('/:id', validateBody(updateTicketSchema), tickets.update)
ticketsRouter.delete('/:id', tickets.remove)
ticketsRouter.post('/:id/status', validateBody(changeStatusSchema), tickets.changeStatus)
ticketsRouter.post(
  '/:id/assign',
  requireRole('AGENT', 'ADMIN'),
  validateBody(assignTicketSchema),
  tickets.assign,
)
ticketsRouter.get('/:id/comments', tickets.listComments)
ticketsRouter.post('/:id/comments', validateBody(commentSchema), tickets.addComment)
