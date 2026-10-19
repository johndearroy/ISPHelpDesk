import type { Request, Response } from 'express'
import { parseId } from '../lib/params.js'
import { incidentQuerySchema } from '../schemas/incident.js'
import * as incidentService from '../services/incidentService.js'

export async function list(req: Request, res: Response) {
  const { status } = incidentQuerySchema.parse(req.query)
  res.json(await incidentService.listIncidents(status))
}

export async function suggestions(_req: Request, res: Response) {
  res.json(await incidentService.getSuggestions())
}

export async function show(req: Request, res: Response) {
  res.json(await incidentService.getIncident(parseId(req.params.id)))
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await incidentService.createIncident(req.user, req.body))
}

export async function linkTickets(req: Request, res: Response) {
  const incident = await incidentService.linkTickets(
    req.user,
    parseId(req.params.id),
    req.body.ticketIds,
  )
  res.json(incident)
}

export async function resolve(req: Request, res: Response) {
  const incident = await incidentService.resolveIncident(
    req.user,
    parseId(req.params.id),
    req.body.resolutionNote,
  )
  res.json(incident)
}
