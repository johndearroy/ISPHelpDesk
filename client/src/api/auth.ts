import { api } from './client'
import type { User } from './types'

export type RegisterInput = { name: string; email: string; password: string; area: string }

export const authApi = {
  me: () => api.get<User>('/auth/me'),
  login: (input: { email: string; password: string }) => api.post<User>('/auth/login', input),
  register: (input: RegisterInput) => api.post<User>('/auth/register', input),
  logout: () => api.post<void>('/auth/logout'),
}
