export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type AnalysisStatus = 'PENDING' | 'DONE' | 'FALLBACK' | 'FAILED'
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED'
export type Language = 'ENGLISH' | 'BANGLISH' | 'BANGLA'
export type IncidentStatus = 'OPEN' | 'RESOLVED'

export type Ref = { id: number; name: string }

export type User = {
  id: number
  name: string
  email: string
  role: Role
  area: string | null
}

export type StaffMember = User & { createdAt: string; openTickets: number }

export type Category = {
  id: number
  name: string
  description: string | null
  _count: { tickets: number }
}

export type TicketListItem = {
  id: number
  title: string
  status: TicketStatus
  priority: Priority
  area: string | null
  dueAt: string
  createdAt: string
  resolvedAt: string | null
  incidentId: number | null
  category: Ref | null
  createdBy: Ref
  assignedTo: Ref | null
  analysis: { status: AnalysisStatus } | null
  isOverdue: boolean
}

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }

export type TicketEvent = {
  id: number
  fromStatus: TicketStatus | null
  toStatus: TicketStatus
  note: string | null
  createdAt: string
  actor: Ref | null
}

export type Analysis = {
  id: number
  status: AnalysisStatus
  categoryId: number | null
  priority: Priority | null
  sentiment: Sentiment | null
  language: Language | null
  summary: string | null
  reason: string | null
  ruleRaisedPriority: boolean
  model: string | null
  finalCategoryId: number | null
  finalPriority: Priority | null
  reviewedAt: string | null
  category: Ref | null
  finalCategory: Ref | null
  reviewedBy: Ref | null
}

export type TicketDetail = Omit<TicketListItem, 'analysis' | 'createdBy'> & {
  description: string
  resolutionNote: string | null
  createdBy: Ref & { email: string; area: string | null }
  incident: { id: number; title: string; status: IncidentStatus } | null
  events: TicketEvent[]
  // customers only get the status, staff get the full analysis
  analysis: (Partial<Analysis> & { status: AnalysisStatus }) | null
}

export type Comment = {
  id: number
  body: string
  createdAt: string
  replyDraftId: number | null
  author: { id: number; name: string; role: Role }
}

export type Stats = {
  statusCounts: Record<TicketStatus, number>
  total: number
  overdue: number
  avgResolutionHours: number | null
  byCategory: { name: string; count: number }[]
  byArea: { name: string; count: number }[]
  aiAcceptanceRate: number | null
  activeIncidents: number | null
  outageSuggestions: number | null
}

export type TriagePreview = {
  category: Ref | null
  priority: Priority
  sentiment: Sentiment
  language: Language
  summary: string
  reason: string
  ruleRaisedPriority: boolean
  model: string | null
  fallback: boolean
}

export type SimilarTicket = {
  id: number
  title: string
  resolutionNote: string
  category: string | null
  resolvedAt: string | null
  score: number
}

export type NewTicketCheck = {
  similar: SimilarTicket[]
  duplicate: { id: number; title: string; status: TicketStatus; createdAt: string } | null
}

export type ReplyDraft = {
  id: number
  body: string
  model: string | null
  rating: number | null
  fallback: boolean
  fallbackReason: string | null
}

export type ThreadSummary =
  | { available: false; minComments: number; commentCount: number }
  | {
      available: true
      issue: string
      tried: string
      currentState: string
      nextStep: string
      model: string | null
      commentCount: number
      updatedAt: string
    }

export type IncidentListItem = {
  id: number
  title: string
  area: string
  summary: string | null
  status: IncidentStatus
  createdAt: string
  resolvedAt: string | null
  createdBy: Ref
  _count: { tickets: number }
}

export type IncidentDetail = Omit<IncidentListItem, '_count'> & {
  resolutionNote: string | null
  resolvedBy: Ref | null
  tickets: (Omit<TicketListItem, 'category' | 'analysis' | 'resolvedAt' | 'incidentId'> & {
    createdBy: Ref
  })[]
}

export type OutageSuggestion = {
  area: string
  ticketIds: number[]
  customerCount: number
  firstReportAt: string
  lastReportAt: string
  windowMinutes: number
  tickets: { id: number; title: string; createdAt: string }[]
}

export type EvaluationReport = {
  generatedAt: string
  datasetSize: number
  results: {
    name: string
    failed: number
    validRate: number
    category: { accuracy: number; macroF1: number; byLanguage: Record<string, number> }
    priority: { accuracy: number; underTriageRate: number }
    latencyMs: { average: number; p95: number | null }
  }[]
  outage: { scenarios: number; precision: number; recall: number }
}

export type AiUsage = {
  days: number
  configured: boolean
  models: string[]
  coolingDown: { model: string; until: string }[]
  totals: {
    requests: number
    success: number
    fallback: number
    failedAttempts: number
    fallbackRate: number | null
    promptTokens: number
    completionTokens: number
    latencyP50: number | null
    latencyP95: number | null
  }
  byModel: { model: string; success: number; failed: number; errors: Record<string, number> }[]
  fallbackReasons: Record<string, number>
  daily: { date: string; success: number; fallback: number }[]
  triage: {
    reviewed: number
    accepted: number
    acceptanceRate: number | null
    byCategory: { category: string; reviewed: number; overridden: number }[]
  }
  drafts: {
    generated: number
    sent: number
    thumbsUp: number
    thumbsDown: number
    avgEditRatio: number | null
  }
  deflections: number
  duplicateWarnings: number
  evaluation: EvaluationReport | null
}
