import { api, toQuery } from './client'
import type { AiUsage, NewTicketCheck, TriagePreview } from './types'

type TicketText = { title: string; description: string }

export const aiApi = {
  triagePreview: (input: TicketText) => api.post<TriagePreview>('/ai/triage-preview', input),
  checkNewTicket: (input: TicketText) => api.post<NewTicketCheck>('/ai/similar', input),
  deflect: (matchedTicketId: number) => api.post('/ai/deflections', { matchedTicketId }),
  usage: (days: number) => api.get<AiUsage>(`/ai/usage${toQuery({ days })}`),
}
