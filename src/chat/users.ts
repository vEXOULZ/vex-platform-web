// A chatter's public Twitch profile, for the card that opens on a name in chat. Helix needs a token, so by default it
// comes from ivr.fi's public API (no key, CORS open), the way `loadChannelEmotes` goes straight to the emote
// providers. A site with its own endpoint passes `userLookup` to `createPlatformUi` instead.
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
  followers: number | null
  /** The chat colour they chose. */
  color: string | null
  partner: boolean
  affiliate: boolean
  staff: boolean
  /** A verified chat bot. */
  bot: boolean
  /** Suspended on Twitch; `banReason` is Twitch's code for why (`TOS_INDEFINITE`, `DMCA`…) when given. */
  banned: boolean
  banReason: string | null
}

export type UserLookup = (key: UserKey, opts?: { signal?: AbortSignal }) => Promise<TwitchUser | null>

export const USER_API = {
  ivr: (key: UserKey) =>
    key.id
      ? `https://api.ivr.fi/v2/twitch/user?id=${encodeURIComponent(key.id)}`
      : `https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(key.login ?? '')}`,
} as const

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const https = (v: unknown): string | null => {
  const s = str(v)
  return s && s.startsWith('https://') ? s : null
}

/** One user from ivr.fi's `/v2/twitch/user` (an array), or null when it isn't one. */
export function parseIvrUser(body: unknown): TwitchUser | null {
  const u = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | null | undefined
  if (!u || typeof u !== 'object') return null
  const id = str(u.id) ?? (typeof u.id === 'number' ? String(u.id) : null)
  const login = str(u.login)
  if (!id || !login) return null
  const roles = (u.roles ?? {}) as Record<string, unknown>
  return {
    id,
    login,
    displayName: str(u.displayName) ?? login,
    avatar: https(u.logo),
    bio: str(u.bio)?.trim() || null,
    createdAt: str(u.createdAt),
    followers: typeof u.followers === 'number' ? u.followers : null,
    color: str(u.chatColor),
    partner: roles.isPartner === true,
    affiliate: roles.isAffiliate === true,
    staff: roles.isStaff === true,
    bot: u.verifiedBot === true,
    banned: u.banned === true,
    banReason: str(u.banReason),
  }
}

const cache = new Map<string, Promise<TwitchUser | null>>()
const cacheKey = (k: UserKey) => (k.id ? `id:${k.id}` : `login:${(k.login ?? '').toLowerCase()}`)

/**
 * A user's public profile, by id or login. Null when Twitch has no such user (or the key is empty). Each user is
 * fetched once per page load; a failed request isn't remembered, so opening the card again retries it.
 */
export function loadTwitchUser(key: UserKey, opts: { signal?: AbortSignal; fetch?: Fetch } = {}): Promise<TwitchUser | null> {
  if (!key.id && !key.login) return Promise.resolve(null)
  const k = cacheKey(key)
  const hit = cache.get(k)
  if (hit) return hit
  const fetcher = opts.fetch ?? ((input: string, init?: RequestInit) => globalThis.fetch(input, init))
  const p = (async () => {
    const res = await fetcher(USER_API.ivr(key), { headers: { accept: 'application/json' } })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Twitch profile lookup failed (${res.status})`)
    return parseIvrUser(await res.json())
  })()
  cache.set(k, p)
  p.catch(() => cache.delete(k))
  // The shared request isn't aborted with one caller's signal; only that caller stops waiting.
  if (!opts.signal) return p
  const signal = opts.signal
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'))
    if (signal.aborted) return abort()
    signal.addEventListener('abort', abort, { once: true })
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

/** Forget every looked-up user (for tests, or a site that wants fresh data). */
export function clearUserCache(): void {
  cache.clear()
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
