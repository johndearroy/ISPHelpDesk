import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import { prisma } from './db.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { authRouter } from './routes/auth.js'

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

app.use(notFound)
app.use(errorHandler)
