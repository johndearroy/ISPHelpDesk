import type { Priority, TicketStatus } from '../api/types'

export const AREAS = ['Mirpur', 'Dhanmondi', 'Uttara', 'Gulshan', 'Mohammadpur', 'Banani', 'Badda']

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ')
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | Date) {
  return dateFormat.format(new Date(value))
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

export function timeAgo(value: string | Date) {
  const diff = new Date(value).getTime() - Date.now()
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return relative.format(Math.round(diff / ms), unit)
  }
  return 'just now'
}

export function formatDuration(ms: number) {
  const hours = Math.floor(Math.abs(ms) / 3_600_000)
  if (hours >= 48) return `${Math.floor(hours / 24)}d`
  if (hours >= 1) return `${hours}h`
  return `${Math.max(1, Math.floor(Math.abs(ms) / 60_000))}m`
}

export function dueLabel(dueAt: string, status: TicketStatus) {
  if (status === 'RESOLVED' || status === 'CLOSED') return null
  const diff = new Date(dueAt).getTime() - Date.now()
  return diff < 0 ? `Overdue by ${formatDuration(diff)}` : `Due in ${formatDuration(diff)}`
}
