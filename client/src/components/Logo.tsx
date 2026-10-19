import { MessageSquareText } from 'lucide-react'

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-glow">
        <MessageSquareText className="size-5" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-slate-900 dark:text-white">Helpdesk</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Support center</p>
      </div>
    </div>
  )
}
