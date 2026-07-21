/**
 * Single source of truth for the app's primary navigation.
 * Add/remove/reorder entries here — `AppHeader` renders this list directly,
 * so every authenticated view picks up the change automatically.
 */
export interface NavItem {
  /** Route name this entry links to. */
  name: string
  /** Label shown in the nav bar. */
  label: string
  /** Additional route names (e.g. detail/drill-down pages) that should keep this entry highlighted. */
  activeFor?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', label: 'Flight' },
  { name: 'airports', label: 'Airports', activeFor: ['timetable'] },
  { name: 'radars', label: 'Radars', activeFor: ['radar-tracking'] },
]
