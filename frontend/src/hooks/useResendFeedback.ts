import { ApiError } from '../api/client'
import { useResendVerification } from './useAuth'

export type ResendFeedback = 'sent' | 'too-many' | 'error' | null

/** Resend-confirmation mutation plus which message to show for its result. */
export function useResendFeedback() {
  const resend = useResendVerification()
  let feedback: ResendFeedback = null
  if (resend.isSuccess) feedback = 'sent'
  else if (resend.error instanceof ApiError && resend.error.status === 429) feedback = 'too-many'
  else if (resend.isError) feedback = 'error'
  return { resend, feedback }
}
