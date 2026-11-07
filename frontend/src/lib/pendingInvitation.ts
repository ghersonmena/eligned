/**
 * Someone opened an invitation link without a session: remember it so the
 * app takes them back there after they sign in (or after creating their
 * account and confirming the email).
 */
const KEY = 'invitacion-pendiente'

export function rememberInvitation(token: string) {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    // Private mode: they can open the link again.
  }
}

export function takePendingInvitation(): string | null {
  try {
    const token = localStorage.getItem(KEY)
    if (token) localStorage.removeItem(KEY)
    return token
  } catch {
    return null
  }
}
