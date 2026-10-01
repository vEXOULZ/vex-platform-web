// Times as the components show them. Sites with their own formatting pass it in instead (see `./vue`'s config).

/** Local date and time, for tooltips and detail views. */
export const stamp = (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleString() : '—')

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

let rtf: Intl.RelativeTimeFormat | null = null

/** "3 minutes ago", "in 2 hours", "just now". */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—'
  const s = (Date.parse(iso) - now) / 1000
  if (!Number.isFinite(s)) return '—'
  if (Math.abs(s) < 45) return 'just now'
  rtf ??= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of UNITS) if (Math.abs(s) >= size) return rtf.format(Math.round(s / size), unit)
  return rtf.format(Math.round(s / 60), 'minute')
}
