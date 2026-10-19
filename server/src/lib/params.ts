import { HttpError } from './httpError.js'

export function parseId(value: string | string[] | undefined) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(404, 'Not found')
  }
  return id
}
