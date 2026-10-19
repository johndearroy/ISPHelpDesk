import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '../api/client'

// shows server side validation messages next to the matching form fields
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  if (!(error instanceof ApiError) || !error.details) return false

  let applied = false
  for (const [field, messages] of Object.entries(error.details)) {
    if (messages?.length) {
      setError(field as Path<T>, { message: messages[0] })
      applied = true
    }
  }
  return applied
}
