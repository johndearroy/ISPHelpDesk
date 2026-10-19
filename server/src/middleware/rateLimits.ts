import { rateLimit } from 'express-rate-limit'
import { config } from '../config.js'

const skip = () => config.NODE_ENV === 'test'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip,
  message: { error: { message: 'Too many attempts, please try again in a few minutes' } },
})

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  skip,
  keyGenerator: (req) => String(req.user.id),
  message: { error: { message: 'Too many AI requests, please slow down' } },
})
