// Emote sets and image URLs. Lookup order matches the old vods site: native Twitch fragments first, then 7TV, FFZ, BTTV.
import type { RawThirdPartyEmote } from './types'

export type EmoteProvider = 'twitch' | '7tv' | 'ffz' | 'bttv'

export interface Emote {
  provider: EmoteProvider
  id: string
  code: string
  /** Drawn over the emote before it instead of beside it (7TV zero-width, BTTV's overlay emotes). */
  zeroWidth?: boolean
}

/** What an emote modifier does to the emote it applies to. */
export type ModifierEffect = 'wide' | 'flipX' | 'flipY' | 'rotateLeft' | 'rotateRight' | 'cursed' | 'party' | 'shake' | 'zeroSpace'

/**
 * BTTV's modifiers go before the emote (`w! KEKW`). `z!` (zero-space) lays the emote over the one before it. The
 * archive saves them as plain global emotes, so they're known by code.
 */
export const BTTV_MODIFIERS: Readonly<Record<string, ModifierEffect>> = {
  'w!': 'wide',
  'h!': 'flipX',
  'v!': 'flipY',
  'l!': 'rotateLeft',
  'r!': 'rotateRight',
  'c!': 'cursed',
  'p!': 'party',
  's!': 'shake',
  'z!': 'zeroSpace',
}

/** FFZ's modifiers go after the emote (`KEKW ffzW`). The saved sets drop FFZ's `modifier` fields, so known by code. */
export const FFZ_MODIFIERS: Readonly<Record<string, ModifierEffect>> = {
  ffzW: 'wide',
  ffzX: 'flipX',
  ffzY: 'flipY',
  ffzCursed: 'cursed',
}

/** BTTV's global emotes that draw over the emote before them. */
export const BTTV_OVERLAYS: ReadonlySet<string> = new Set(['cvHazmat', 'cvMask', 'IceCold', 'SoSnowy', 'SantaHat', 'TopHat', 'ReinDeer', 'CandyCane'])

/** The modifier an emote stands for, or null. */
export function modifierOf(e: Pick<Emote, 'provider' | 'code'>): { effect: ModifierEffect; before: boolean } | null {
  if (e.provider === 'bttv' && Object.hasOwn(BTTV_MODIFIERS, e.code)) return { effect: BTTV_MODIFIERS[e.code]!, before: true }
  if (e.provider === 'ffz' && Object.hasOwn(FFZ_MODIFIERS, e.code)) return { effect: FFZ_MODIFIERS[e.code]!, before: false }
  return null
}

const zeroWidth = (provider: '7tv' | 'ffz' | 'bttv', raw: RawThirdPartyEmote, code: string) =>
  provider === '7tv' ? ((raw.flags ?? 0) & 1) !== 0 || ((raw.data?.flags ?? 0) & 256) !== 0 : provider === 'bttv' && BTTV_OVERLAYS.has(code)

export interface EmoteImage {
  /** 1x URL, for `src`. */
  src: string
  /** For `srcset`. */
  srcset: string
  /** Largest size, for a tooltip preview. */
  large: string
}

export const EMOTE_CDN = {
  twitch: 'https://static-cdn.jtvnw.net/emoticons/v2',
  ffz: 'https://cdn.frankerfacez.com/emote',
  // Every provider's own CDN (no third-party mirrors). 7TV redirects emotes that moved to new ids; its CDN follows.
  bttv: 'https://cdn.betterttv.net/emote',
  '7tv': 'https://cdn.7tv.app/emote',
} as const

/** 7TV's global set. */
export const SEVENTV_GLOBAL = 'https://7tv.io/v3/emote-sets/global'

// Each provider's image URL for a size, and the sizes it serves (srcset descriptor → size in the URL), smallest first.
const IMAGES: Record<EmoteProvider, { url: (id: string, size: string) => string; sizes: Record<string, string> }> = {
  twitch: { url: (id, s) => `${EMOTE_CDN.twitch}/${id}/default/dark/${s}`, sizes: { '1x': '1.0', '2x': '2.0', '4x': '3.0' } },
  '7tv': { url: (id, s) => `${EMOTE_CDN['7tv']}/${id}/${s}.webp`, sizes: { '1x': '1x', '2x': '2x', '3x': '3x', '4x': '4x' } },
  ffz: { url: (id, s) => `${EMOTE_CDN.ffz}/${id}/${s}`, sizes: { '1x': '1', '2x': '2', '4x': '4' } },
  bttv: { url: (id, s) => `${EMOTE_CDN.bttv}/${id}/${s}`, sizes: { '1x': '1x', '2x': '2x', '3x': '3x' } },
}

export function emoteImage(e: Pick<Emote, 'provider' | 'id'>): EmoteImage {
  const key = `${e.provider}:${e.id}`
  let image = images.get(key)
  if (!image) {
    const { url, sizes } = IMAGES[e.provider]
    const id = encodeURIComponent(e.id)
    const urls = Object.entries(sizes).map(([d, s]) => [d, url(id, s)] as const)
    image = { src: urls[0]![1], srcset: urls.map(([d, u]) => `${u} ${d}`).join(', '), large: urls.at(-1)![1] }
    images.set(key, image)
  }
  return image
}
// Chat repeats the same few emotes, so each one's URLs are built once.
const images = new Map<string, EmoteImage>()

// Each provider's page for an emote. Twitch has none, and which channel a Twitch emote belongs to isn't saved with chat.
const PAGES: Record<Exclude<EmoteProvider, 'twitch'>, string> = {
  '7tv': 'https://7tv.app/emotes/',
  bttv: 'https://betterttv.com/emotes/',
  ffz: 'https://www.frankerfacez.com/emoticon/',
}

/** The emote's page on its provider's site, or null (Twitch emotes). */
export function emotePage(e: Pick<Emote, 'provider' | 'id'>): string | null {
  return e.provider === 'twitch' ? null : PAGES[e.provider] + encodeURIComponent(e.id)
}

/** Code → emote, per third-party provider. */
export class EmoteSet {
  private readonly maps: Record<'7tv' | 'ffz' | 'bttv', Map<string, Emote>> = {
    '7tv': new Map(),
    ffz: new Map(),
    bttv: new Map(),
  }

  add(provider: '7tv' | 'ffz' | 'bttv', emotes: readonly RawThirdPartyEmote[] | null | undefined): this {
    for (const raw of emotes ?? []) {
      const code = raw.name ?? raw.code
      if (!code || raw.id == null) continue
      // First one wins, like the old site's Array.find.
      if (this.maps[provider].has(code)) continue
      const emote: Emote = { provider, id: String(raw.id), code }
      if (zeroWidth(provider, raw, code)) emote.zeroWidth = true
      this.maps[provider].set(code, emote)
    }
    return this
  }

  /** The emote a word stands for, 7TV first, then FFZ, then BTTV. */
  find(word: string): Emote | null {
    return this.maps['7tv'].get(word) ?? this.maps.ffz.get(word) ?? this.maps.bttv.get(word) ?? null
  }

  get size(): number {
    return this.maps['7tv'].size + this.maps.ffz.size + this.maps.bttv.size
  }
}

