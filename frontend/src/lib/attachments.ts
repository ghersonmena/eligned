/** Limits for files attached to comments (the API enforces the same ones). */
export const MAX_FILES = 5
export const MAX_BYTES = 10 * 1024 * 1024
/** Same list the API accepts. */
export const ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,image/heic,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.zip,.rar,.7z'

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
