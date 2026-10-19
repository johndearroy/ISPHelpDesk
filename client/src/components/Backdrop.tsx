export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-violet-50 to-teal-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950" />
      <div className="absolute -top-40 -left-32 size-[32rem] rounded-full bg-brand-400/30 blur-3xl dark:bg-brand-600/20" />
      <div className="absolute top-1/3 -right-40 size-[28rem] rounded-full bg-accent-500/25 blur-3xl dark:bg-accent-600/20" />
      <div className="absolute -bottom-40 left-1/3 size-[26rem] rounded-full bg-teal-glow/25 blur-3xl dark:bg-teal-glow/10" />
    </div>
  )
}
