type Props = {
  items: { name: string; count: number }[]
  emptyText?: string
}

export function BarList({ items, emptyText = 'No data yet' }: Props) {
  if (!items.length) {
    return <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>
  }

  const max = Math.max(...items.map((item) => item.count))
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
            <span className="font-medium text-slate-900 tabular-nums dark:text-white">
              {item.count}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
