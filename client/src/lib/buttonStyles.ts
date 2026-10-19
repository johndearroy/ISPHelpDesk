import clsx from 'clsx'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow hover:brightness-110 disabled:shadow-none',
  secondary:
    'bg-white/80 text-slate-700 ring-1 ring-slate-200 hover:bg-white dark:bg-slate-800/80 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    className,
  )
}
