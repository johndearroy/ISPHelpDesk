const accounts = [
  { label: 'Admin', email: 'admin@demo.local' },
  { label: 'Agent', email: 'rahim@demo.local' },
  { label: 'Customer', email: 'karim@demo.local' },
]

export const DEMO_PASSWORD = 'demo1234'

export function DemoLogins({ onPick }: { onPick: (email: string) => void }) {
  if (import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'true') return null

  return (
    <div className="mt-6 border-t border-slate-200/70 pt-5 dark:border-white/10">
      <p className="mb-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Demo accounts (password {DEMO_PASSWORD})
      </p>
      <div className="grid grid-cols-3 gap-2">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => onPick(account.email)}
            className="rounded-xl bg-white/70 px-2 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:ring-white/10"
          >
            {account.label}
          </button>
        ))}
      </div>
    </div>
  )
}
