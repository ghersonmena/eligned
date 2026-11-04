/** Placeholder mark until the app has a real name and logo. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="var(--accent)" />
      <circle cx="22" cy="8" r="6" fill="var(--text)" />
      <circle cx="8" cy="22" r="6" fill="var(--text)" />
      <circle cx="22" cy="22" r="6" fill="var(--text)" />
    </svg>
  )
}
