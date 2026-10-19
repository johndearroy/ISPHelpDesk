import { api } from './client'
import type { IncidentDetail, IncidentListItem, OutageSuggestion } from './types'

export const incidentsApi = {
  list: () => api.get<IncidentListItem[]>('/incidents'),
  suggestions: () => api.get<OutageSuggestion[]>('/incidents/suggestions'),
  get: (id: number) => api.get<IncidentDetail>(`/incidents/${id}`),
  create: (input: { area: string; ticketIds: number[]; title?: string }) =>
    api.post<IncidentDetail & { fallback: boolean }>('/incidents', input),
  resolve: (id: number, resolutionNote: string) =>
    api.post<IncidentDetail & { resolvedTickets: number }>(`/incidents/${id}/resolve`, {
      resolutionNote,
    }),
}
