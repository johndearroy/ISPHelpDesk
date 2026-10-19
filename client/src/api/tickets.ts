import { api, toQuery } from './client'
import type {
  Analysis,
  Comment,
  Page,
  Priority,
  ReplyDraft,
  SimilarTicket,
  ThreadSummary,
  TicketDetail,
  TicketListItem,
  TicketStatus,
} from './types'

export type TicketFilters = {
  status?: string
  priority?: string
  categoryId?: string
  area?: string
  search?: string
  overdue?: string
  assigned?: string
  page?: number
  pageSize?: number
}

export type TicketUpdate = {
  title?: string
  description?: string
  priority?: Priority
  categoryId?: number | null
}

export const ticketsApi = {
  list: (filters: TicketFilters) => api.get<Page<TicketListItem>>(`/tickets${toQuery(filters)}`),
  get: (id: number) => api.get<TicketDetail>(`/tickets/${id}`),
  create: (input: { title: string; description: string }) =>
    api.post<TicketListItem>('/tickets', input),
  update: (id: number, input: TicketUpdate) => api.patch<TicketDetail>(`/tickets/${id}`, input),
  remove: (id: number) => api.delete(`/tickets/${id}`),
  changeStatus: (
    id: number,
    input: { status: TicketStatus; note?: string; resolutionNote?: string },
  ) => api.post<TicketDetail>(`/tickets/${id}/status`, input),
  assign: (id: number, assigneeId: number | null) =>
    api.post<TicketDetail>(`/tickets/${id}/assign`, { assigneeId }),
  comments: (id: number) => api.get<Comment[]>(`/tickets/${id}/comments`),
  addComment: (id: number, input: { body: string; replyDraftId?: number }) =>
    api.post<Comment>(`/tickets/${id}/comments`, input),
  analysis: (id: number) => api.get<Analysis>(`/tickets/${id}/analysis`),
  reviewAnalysis: (id: number, input: { categoryId: number; priority: Priority }) =>
    api.post<Analysis>(`/tickets/${id}/analysis/review`, input),
  retryAnalysis: (id: number) => api.post<Analysis>(`/tickets/${id}/analysis/retry`),
  createReplyDraft: (id: number) => api.post<ReplyDraft>(`/tickets/${id}/reply-drafts`),
  rateDraft: (draftId: number, rating: 1 | -1) =>
    api.patch<ReplyDraft>(`/reply-drafts/${draftId}`, { rating }),
  summary: (id: number) => api.get<ThreadSummary>(`/tickets/${id}/summary`),
  similar: (id: number) => api.get<SimilarTicket[]>(`/tickets/${id}/similar`),
}
