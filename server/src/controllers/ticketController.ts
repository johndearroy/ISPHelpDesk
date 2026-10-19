import type { Request, Response } from 'express'
import { parseId } from '../lib/params.js'
import { ticketQuerySchema } from '../schemas/ticket.js'
import * as commentService from '../services/commentService.js'
import * as ticketService from '../services/ticketService.js'

export async function list(req: Request, res: Response) {
  const query = ticketQuerySchema.parse(req.query)
  res.json(await ticketService.listTickets(req.user, query))
}

export async function show(req: Request, res: Response) {
  res.json(await ticketService.getTicket(req.user, parseId(req.params.id)))
}

export async function create(req: Request, res: Response) {
  const ticket = await ticketService.createTicket(req.user, req.body)
  res.status(201).json(ticket)
}

export async function update(req: Request, res: Response) {
  res.json(await ticketService.updateTicket(req.user, parseId(req.params.id), req.body))
}

export async function remove(req: Request, res: Response) {
  await ticketService.deleteTicket(req.user, parseId(req.params.id))
  res.status(204).end()
}

export async function changeStatus(req: Request, res: Response) {
  res.json(await ticketService.changeStatus(req.user, parseId(req.params.id), req.body))
}

export async function assign(req: Request, res: Response) {
  const ticket = await ticketService.assignTicket(
    req.user,
    parseId(req.params.id),
    req.body.assigneeId,
  )
  res.json(ticket)
}

export async function listComments(req: Request, res: Response) {
  res.json(await commentService.listComments(req.user, parseId(req.params.id)))
}

export async function addComment(req: Request, res: Response) {
  const comment = await commentService.addComment(req.user, parseId(req.params.id), req.body)
  res.status(201).json(comment)
}
