import { Router } from 'express'
import * as users from '../controllers/userController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const usersRouter = Router()

usersRouter.get('/', requireAuth, requireRole('AGENT', 'ADMIN'), users.list)
