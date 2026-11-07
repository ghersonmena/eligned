import { t } from './i18n'

// The board columns every workspace starts with (TaskStatus::DEFAULTS on the server).
const DEFAULTS = new Set(['Por hacer', 'En progreso', 'En revisión', 'Hecho'])

/** A status name in the current language: the default columns are translated, renamed ones are shown as written. */
export function statusName(name: string): string {
  if (!DEFAULTS.has(name)) return name
  switch (name) {
    case 'Por hacer':
      return t('Por hacer')
    case 'En progreso':
      return t('En progreso')
    case 'En revisión':
      return t('En revisión')
    default:
      return t('Hecho')
  }
}
