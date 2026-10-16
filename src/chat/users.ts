// A chatter's public Twitch profile, for the card that opens on a name in chat. Helix needs a token, so a backend
// looks it up: doomtp-bot's `GET /api/v2/twitch/users?id=|login=` (its ADR-0035). A site hands
// `twitchUserLookup(url)` to `createPlatformUi({ userLookup })`; without one the card shows what the chat line knows.
import type { Fetch } from './channel'

/** Who to look up: the Twitch id when chat has it (doomtp-bot's), else the login. */
export interface UserKey {
  id?: string | null
  login?: string | null
}

export interface TwitchUser {
  id: string
  login: string
  displayName: string
  /** The profile picture's URL. */
  avatar: string | null
  bio: string | null
  /** When the account was made, ISO 8601. */
  createdAt: string | null
  broadcasterType: 'partner' | 'affiliate' | null
  /** Twitch staff, admin or global moderator. */
  staff: boolean
}

export type UserLookup = (key: UserKey, opts?: { signal?: AbortSignal }) => Promise<TwitchUser | null>

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const https = (v: unknown): string | null => {
  const s = str(v)
  return s && s.startsWith('https://') ? s : null
}

/** One user as doomtp-bot's `/api/v2/twitch/users` gives it (Helix's fields, snake_case), or null if it isn't one. */
export function parseTwitchUser(body: unknown): TwitchUser | null {
  const u = body as Record<string, unknown> | null | undefined
  if (!u || typeof u !== 'object') return null
  const id = str(u.id)
  const login = str(u.login)
  if (!id || !login) return null
  const kind = str(u.broadcaster_type)
  return {
    id,
    login,
    displayName: str(u.display_name) ?? login,
    avatar: https(u.profile_image_url),
    bio: str(u.description)?.trim() || null,
    createdAt: str(u.created_at),
    broadcasterType: kind === 'partner' || kind === 'affiliate' ? kind : null,
    staff: ['staff', 'admin', 'global_mod'].includes(str(u.type) ?? ''),
  }
}

/** The query for a key: the id when there is one (the backend prefers it), else the login. */
export const userQuery = (key: UserKey): string =>
  key.id ? `id=${encodeURIComponent(key.id)}` : `login=${encodeURIComponent((key.login ?? '').toLowerCase())}`

export interface TwitchUserLookupOptions {
  fetch?: Fetch
  /** Default `omit`: the route needs no sign-in, and another origin's cookies shouldn't ride along. */
  credentials?: RequestCredentials
}

/**
 * A `userLookup` over a backend's `GET <url>?id=…` / `?login=…` (doomtp-bot's `/api/v2/twitch/users`, on the
 * site's own origin or, listed in the bot's USER_LOOKUP_ORIGINS, on the bot's). Null when it answers 404 (no such
 * user now). Each user is asked once per page load; a failed request isn't remembered, so opening the card again
 * retries it.
 */
export function twitchUserLookup(url: string, opts: TwitchUserLookupOptions = {}): UserLookup {
  const cache = new Map<string, Promise<TwitchUser | null>>()
  const fetcher = opts.fetch ?? ((input: string, init?: RequestInit) => globalThis.fetch(input, init))
  return (key, call = {}) => {
    if (!key.id && !key.login) return Promise.resolve(null)
    const q = userQuery(key)
    let p = cache.get(q)
    if (!p) {
      p = (async () => {
        const res = await fetcher(`${url}${url.includes('?') ? '&' : '?'}${q}`, {
          headers: { accept: 'application/json' },
          credentials: opts.credentials ?? 'omit',
        })
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`Twitch profile lookup failed (${res.status})`)
        return parseTwitchUser(await res.json())
      })()
      cache.set(q, p)
      p.catch(() => cache.delete(q))
    }
    // The shared request isn't aborted with one caller's signal; only that caller stops waiting.
    const signal = call.signal
    if (!signal) return p
    const shared = p
    return new Promise((resolve, reject) => {
      const abort = () => reject(new DOMException('Aborted', 'AbortError'))
      if (signal.aborted) return abort()
      signal.addEventListener('abort', abort, { once: true })
      shared.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
    })
  }
}

/** "11 years", "3 months", "5 days": how long ago an ISO time was, in its largest whole unit. */
export function accountAge(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const days = Math.floor((now - t) / 86_400_000)
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  if (days >= 365) return unit(Math.floor(days / 365.25) || 1, 'year')
  if (days >= 30) return unit(Math.floor(days / 30.44) || 1, 'month')
  return unit(Math.max(days, 0), 'day')
}
