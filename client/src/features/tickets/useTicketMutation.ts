import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '../../api/client'

// shared invalidation and error toast for every action on the ticket detail page
export function useTicketMutation<TInput, TResult>(
  ticketId: number,
  mutationFn: (input: TInput) => Promise<TResult>,
  successMessage?: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      if (successMessage) toast.success(successMessage)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
