import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { authApi, type LoginInput, type Preferences, type RegisterInput, type User } from '../api/auth'

const ME_KEY = ['me'] as const

/** The signed-in user, or null when there is no session. */
export function useMe() {
  return useQuery<User | null>({
    queryKey: ME_KEY,
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
    // While waiting for the email confirmation, re-check whenever the tab regains focus.
    refetchOnWindowFocus: (query) => (query.state.data?.email_verified === false ? 'always' : true),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(ME_KEY, null)
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    },
  })
}

export function useResendVerification() {
  return useMutation({ mutationFn: () => authApi.resendVerification() })
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: Partial<Preferences>) => authApi.updatePreferences(prefs),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  })
}
