import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import { prisma } from './db.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { aiRouter } from './routes/ai.js'
import { authRouter } from './routes/auth.js'
import { categoriesRouter } from './routes/categories.js'
import { replyDraftsRouter } from './routes/replyDrafts.js'
import { statsRouter } from './routes/stats.js'
import { ticketsRouter } from './routes/tickets.js'
import { usersRouter } from './routes/users.js'

export const app = express()

// render and vercel sit in front of the api, rate limiting needs the real client ip
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/users', usersRouter)
app.use('/api/stats', statsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/reply-drafts', replyDraftsRouter)

app.use(notFound)
app.use(errorHandler)
