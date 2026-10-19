import { Router } from 'express'
import * as auth from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimits.js'
import { validateBody } from '../middleware/validate.js'
import { loginSchema, registerSchema } from '../schemas/auth.js'

export const authRouter = Router()

authRouter.post('/register', authLimiter, validateBody(registerSchema), auth.register)
authRouter.post('/login', authLimiter, validateBody(loginSchema), auth.login)
authRouter.post('/logout', auth.logout)
authRouter.get('/me', requireAuth, auth.me)
