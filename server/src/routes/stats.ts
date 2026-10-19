import { Router } from 'express'
import * as stats from '../controllers/statsController.js'
import { requireAuth } from '../middleware/auth.js'

export const statsRouter = Router()

statsRouter.get('/', requireAuth, stats.show)
