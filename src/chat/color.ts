// A chatter's name colour, as Twitch picks it. No dependency on any site's design: sites style the rest.

export function hash31(name: string): number {
  let x = 0
  for (const c of name) x = (x * 31 + c.charCodeAt(0)) >>> 0
  return x
}

/** Twitch's fallback palette for chatters who never chose a colour. */
export const TWITCH_DEFAULT_COLORS = [
  '#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50', '#9ACD32', '#FF4500', '#2E8B57',
  '#DAA520', '#D2691E', '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F',
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance([r, g, b]: readonly number[]): number {
  const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
}

const readable = new Map<string, string>()

/** Blend towards white until the colour has at least 4.5:1 contrast on black (roughly what Twitch's dark mode does). */
export function readableOnBlack(hex: string): string {
  // Chat renders the same few colours on every line: cached per colour.
  const known = readable.get(hex)
  if (known) return known
  let rgb: number[] = hexToRgb(hex)
  for (let i = 0; i < 20 && (luminance(rgb) + 0.05) / 0.05 < 4.5; i++) {
    rgb = rgb.map((c) => Math.round(c + (255 - c) * 0.12))
  }
  const out = `rgb(${rgb.join(' ')})`
  readable.set(hex, out)
  return out
}

/**
 * A chatter's name colour: their own Twitch colour if they set one, else Twitch's default for that name.
 * `readable` lifts dark colours so they stay legible on black; `raw` returns them unchanged.
 */
export function twitchColor(name: string, color?: string | null, mode: 'readable' | 'raw' = 'readable'): string {
  const hex = color || TWITCH_DEFAULT_COLORS[hash31(name) % TWITCH_DEFAULT_COLORS.length]!
  return mode === 'raw' ? hex : readableOnBlack(hex)
}
