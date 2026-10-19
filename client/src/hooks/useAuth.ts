import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import type { User } from '../api/types'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useCurrentUser() {
  const { data } = useMe()
  if (!data) {
    throw new Error('useCurrentUser must be used inside a protected route')
  }
  return data
}

// drops cached data of the previous user but keeps the 'me' query observed by the layouts
function resetSession(queryClient: QueryClient, user: User | null) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
  queryClient.setQueryData(['me'], user)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => resetSession(queryClient, user),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (user) => resetSession(queryClient, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => resetSession(queryClient, null),
  })
}
