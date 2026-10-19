import type { ErrorRequestHandler, RequestHandler } from 'express'
import { HttpError } from '../lib/httpError.js'

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'Route not found'))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } })
    return
  }

  // errors thrown by express.json, e.g. malformed or oversized bodies
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    res.status(err.status).json({ error: { message: err.message } })
    return
  }

  console.error(err)
  res.status(500).json({ error: { message: 'Something went wrong' } })
}
