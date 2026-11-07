/** Circular progress (0–100) with the percentage in the middle. */
export function ProgressRing({
  value,
  color,
  size = 64,
  stroke = 7,
  track = 'var(--soft)',
  label,
}: {
  value: number
  color: string
  size?: number
  stroke?: number
  track?: string
  /** Text in the middle (the percentage by default). */
  label?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? `${pct}%`} de avance`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.26} fontWeight={800} fill="currentColor">
        {label ?? `${pct}%`}
      </text>
    </svg>
  )
}
