const PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  board: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z',
  timeline: 'M4 6h9M7 12h11M10 18h8',
  folder: 'M3 7h6l2 2h10v10H3z',
  goal: 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0zM16 12a4 4 0 1 1-8 0a4 4 0 1 1 8 0z',
  team: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a3 3 0 1 0 0-6a3 3 0 0 0 0 6M22 20v-2a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14M21 21l-5-5',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  plus: 'M12 5v14M5 12h14',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
} as const

export type IconName = keyof typeof PATHS

interface IconProps {
  name: IconName
  size?: number
}

/** Stroke icon. Decorative by default: label the button or link that contains it. */
export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
