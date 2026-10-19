import { api } from './client'
import type { Category } from './types'

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories'),
  create: (input: { name: string; description?: string }) =>
    api.post<Category>('/categories', input),
  update: (id: number, input: { name?: string; description?: string }) =>
    api.patch<Category>(`/categories/${id}`, input),
  remove: (id: number) => api.delete(`/categories/${id}`),
}
