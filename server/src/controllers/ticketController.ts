import type { Request, Response } from 'express'
import { parseId } from '../lib/params.js'
import { ticketQuerySchema } from '../schemas/ticket.js'
import * as commentService from '../services/commentService.js'
import * as replyDraftService from '../services/replyDraftService.js'
import * as similarService from '../services/similarService.js'
import * as summaryService from '../services/summaryService.js'
import * as ticketService from '../services/ticketService.js'
import * as triageService from '../services/triageService.js'

export async function list(req: Request, res: Response) {
  const query = ticketQuerySchema.parse(req.query)
  res.json(await ticketService.listTickets(req.user, query))
}

export async function show(req: Request, res: Response) {
  res.json(await ticketService.getTicket(req.user, parseId(req.params.id)))
}

export async function create(req: Request, res: Response) {
  const ticket = await ticketService.createTicket(req.user, req.body)
  triageService.startAnalysis(ticket.id)
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

export async function showAnalysis(req: Request, res: Response) {
  res.json(await triageService.getAnalysis(req.user, parseId(req.params.id)))
}

export async function reviewAnalysis(req: Request, res: Response) {
  res.json(await triageService.reviewAnalysis(req.user, parseId(req.params.id), req.body))
}

export async function retryAnalysis(req: Request, res: Response) {
  res.status(202).json(await triageService.retryAnalysis(req.user, parseId(req.params.id)))
}

export async function createReplyDraft(req: Request, res: Response) {
  const draft = await replyDraftService.generateDraft(req.user, parseId(req.params.id))
  res.status(201).json(draft)
}

export async function showSummary(req: Request, res: Response) {
  res.json(await summaryService.getSummary(req.user, parseId(req.params.id)))
}

export async function listSimilar(req: Request, res: Response) {
  res.json(await similarService.similarForTicket(req.user, parseId(req.params.id)))
}
