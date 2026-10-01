// A channel's 7TV / BTTV / FFZ emotes straight from each provider's public API, for chat that isn't tied to a VOD
// (vods-core's `loadEmotes` reads the sets the archive saved instead). Twitch badges need a Twitch token, so they
// come from the site's backend, not from here.
import { EmoteSet, SEVENTV_GLOBAL } from './emotes'
import type { RawThirdPartyEmote } from './types'

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export const EMOTE_API = {
  seventvUser: (twitchId: string) => `https://7tv.io/v3/users/twitch/${encodeURIComponent(twitchId)}`,
  seventvGlobal: SEVENTV_GLOBAL,
  bttvUser: (twitchId: string) => `https://api.betterttv.net/3/cached/users/twitch/${encodeURIComponent(twitchId)}`,
  bttvGlobal: 'https://api.betterttv.net/3/cached/emotes/global',
  ffzRoom: (twitchId: string) => `https://api.frankerfacez.com/v1/room/id/${encodeURIComponent(twitchId)}`,
  ffzGlobal: 'https://api.frankerfacez.com/v1/set/global',
} as const

export interface LoadChannelEmotesOptions {
  fetch?: Fetch
  signal?: AbortSignal
  /** Also load each provider's global set (default true). */
  globals?: boolean
}

type FfzSets = { sets?: Record<string, { emoticons?: RawThirdPartyEmote[] }>; default_sets?: number[] }

const ffzEmotes = (body: FfzSets | null, only?: number[]) =>
  Object.entries(body?.sets ?? {})
    .filter(([id]) => !only || only.includes(Number(id)))
    .flatMap(([, s]) => s.emoticons ?? [])

/**
 * A channel's current emotes, by its Twitch user id: the channel's 7TV, FFZ and BTTV sets first, then the global
 * ones. A provider that fails (or doesn't know the channel) is left out rather than failing chat.
 */
export async function loadChannelEmotes(twitchId: string, opts: LoadChannelEmotesOptions = {}): Promise<EmoteSet> {
  const fetcher = opts.fetch ?? ((input: string, init?: RequestInit) => globalThis.fetch(input, init))
  const get = async <T,>(url: string): Promise<T | null> => {
    try {
      const res = await fetcher(url, { signal: opts.signal })
      return res.ok ? ((await res.json()) as T) : null
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      return null
    }
  }
  const globals = opts.globals ?? true
  const none = Promise.resolve(null)
  const [stvUser, stvGlobal, bttvUser, bttvGlobal, ffzRoom, ffzGlobal] = await Promise.all([
    get<{ emote_set?: { emotes?: RawThirdPartyEmote[] } }>(EMOTE_API.seventvUser(twitchId)),
    globals ? get<{ emotes?: RawThirdPartyEmote[] }>(EMOTE_API.seventvGlobal) : none,
    get<{ channelEmotes?: RawThirdPartyEmote[]; sharedEmotes?: RawThirdPartyEmote[] }>(EMOTE_API.bttvUser(twitchId)),
    globals ? get<RawThirdPartyEmote[]>(EMOTE_API.bttvGlobal) : none,
    get<FfzSets>(EMOTE_API.ffzRoom(twitchId)),
    globals ? get<FfzSets>(EMOTE_API.ffzGlobal) : none,
  ])
  return new EmoteSet()
    .add('7tv', stvUser?.emote_set?.emotes)
    .add('ffz', ffzEmotes(ffzRoom))
    .add('bttv', [...(bttvUser?.channelEmotes ?? []), ...(bttvUser?.sharedEmotes ?? [])])
    .add('7tv', stvGlobal?.emotes)
    .add('ffz', ffzEmotes(ffzGlobal, ffzGlobal?.default_sets))
    .add('bttv', Array.isArray(bttvGlobal) ? bttvGlobal : null)
}
