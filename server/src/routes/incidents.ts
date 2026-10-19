import { Router } from 'express'
import * as incidents from '../controllers/incidentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimits.js'
import { validateBody } from '../middleware/validate.js'
import {
  createIncidentSchema,
  linkTicketsSchema,
  resolveIncidentSchema,
} from '../schemas/incident.js'

export const incidentsRouter = Router()

const adminOnly = requireRole('ADMIN')

incidentsRouter.use(requireAuth, requireRole('AGENT', 'ADMIN'))

incidentsRouter.get('/', incidents.list)
incidentsRouter.get('/suggestions', incidents.suggestions)
incidentsRouter.get('/:id', incidents.show)
incidentsRouter.post(
  '/',
  adminOnly,
  aiLimiter,
  validateBody(createIncidentSchema),
  incidents.create,
)
incidentsRouter.post(
  '/:id/tickets',
  adminOnly,
  validateBody(linkTicketsSchema),
  incidents.linkTickets,
)
incidentsRouter.post(
  '/:id/resolve',
  adminOnly,
  validateBody(resolveIncidentSchema),
  incidents.resolve,
)
