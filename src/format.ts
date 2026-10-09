// Sizes as the components show them, and as sites can show them too.

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** Bytes in binary units, as `du -h` counts them (1 KB = 1024 B): one decimal under 10 with a trailing ".0" dropped,
 *  whole numbers from 10. 512 → "512 B", 1536 → "1.5 KB", 1048576 → "1 MB", 19756849561 → "18 GB". Null → "—". */
export function bytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  let v = Math.abs(n)
  let i = 0
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024
    i++
  }
  let text = i && v < 9.95 ? v.toFixed(1).replace(/\.0$/, '') : String(Math.round(v))
  // 1023.7 KB rounds to 1024: show it as the next unit up.
  if (text === '1024' && i < UNITS.length - 1) {
    text = '1'
    i++
  }
  return `${n < 0 ? '-' : ''}${text} ${UNITS[i]}`
}
