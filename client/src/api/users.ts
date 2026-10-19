import { api, toQuery } from './client'
import type { Role, StaffMember } from './types'

export const usersApi = {
  list: (role?: Role) => api.get<StaffMember[]>(`/users${toQuery({ role })}`),
}
