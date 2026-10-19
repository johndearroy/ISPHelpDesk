import clsx from 'clsx'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const control =
  'w-full rounded-xl border bg-white px-3 text-sm text-slate-800 transition placeholder:text-slate-400 ' +
  'focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 focus:outline-none ' +
  'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

function borderClass(invalid?: boolean) {
  return invalid
    ? 'border-rose-400 dark:border-rose-500/70'
    : 'border-slate-200 dark:border-slate-700'
}

type FieldProps = {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={clsx(control, 'h-10', borderClass(invalid), className)}
      {...props}
    />
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={clsx(control, 'min-h-28 py-2.5 leading-relaxed', borderClass(invalid), className)}
      {...props}
    />
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={clsx(control, 'h-10 pr-8', borderClass(invalid), className)}
      {...props}
    >
      {children}
    </select>
  )
}
