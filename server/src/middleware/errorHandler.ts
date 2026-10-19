import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z, ZodError } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import { HttpError } from '../lib/httpError.js'

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'Route not found'))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Please check the highlighted fields',
        details: z.flattenError(err).fieldErrors,
      },
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { message: 'A record with this value already exists' } })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Not found' } })
      return
    }
  }

  // errors thrown by express.json, e.g. malformed or oversized bodies
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    res.status(err.status).json({ error: { message: err.message } })
    return
  }

  console.error(err)
  res.status(500).json({ error: { message: 'Something went wrong' } })
}
