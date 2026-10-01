import { describe, expect, it, vi } from 'vitest'
import { EmoteSet, loadChannelEmotes, toChatLine, type LogMessage, type LogModeration, type LogNotification, type Token } from '../src/chat'

const plain = (tokens: Token[]) => tokens.map((t) => (t.kind === 'text' ? t.text : `[${t.emote.code}]`)).join('')
const user = { id: '1', login: 'someone', display_name: 'SomeOne' }

const message = (extra: Partial<LogMessage> = {}): LogMessage => ({
  kind: 'message',
  id: 'm1',
  at: '2026-09-30T18:00:00Z',
  user,
  text: 'hi Kappa catJAM',
  fragments: [{ text: 'hi ' }, { text: 'Kappa', emote: { id: '25' } }, { text: ' catJAM' }],
  badges: [{ set_id: 'moderator', id: '1', info: '' }],
  color: '#FF0000',
  bits: 0,
  message_type: 'text',
  reply_parent_id: null,
  reply_parent_user: null,
  reward_id: null,
  source_channel_id: null,
  is_self: false,
  is_command: false,
  source: 'eventsub',
  received_at: null,
  deleted_at: null,
  cleared_at: null,
  run: null,
  ...extra,
})

describe('toChatLine', () => {
  const emotes = new EmoteSet().add('7tv', [{ id: 'sev', name: 'catJAM' }])
  const badges = { global: [{ set_id: 'moderator', versions: [{ id: '1', image_url_1x: 'm1', image_url_2x: 'm2', image_url_4x: 'm4', title: 'Moderator' }] }] }

  it('reads a message: emotes (native and third-party), badges, colour, /me, removal', () => {
    const line = toChatLine(message(), emotes, badges)
    expect(plain(line.tokens)).toBe('hi [Kappa] [catJAM]')
    expect([line.kind, line.user, line.login, line.color, line.badges.map((b) => b.title)]).toEqual(['message', 'SomeOne', 'someone', '#FF0000', ['Moderator']])
    expect(toChatLine(message({ message_type: 'action', bits: 50 })).action).toBe(true)
    expect(toChatLine(message({ deleted_at: '2026-09-30T18:01:00Z' })).removed?.type).toBe('delete')
    expect(toChatLine(message({ reward_id: 'r1' })).reward?.title).toBe('Reward')
  })

  it('reads notifications as notices: the system message, then what they said', () => {
    const n: LogNotification = {
      kind: 'notification',
      id: 'n1',
      at: '2026-09-30T18:00:00Z',
      user,
      type: 'redemption',
      payload: { system_message: 'SomeOne redeemed Hydrate', text: 'drink catJAM', reward: { title: 'Hydrate', cost: 500 } },
      source: 'eventsub',
    }
    const line = toChatLine(n, emotes)
    expect([line.kind, line.noticeType, plain(line.tokens)]).toEqual(['notice', 'redemption', 'SomeOne redeemed Hydrate — drink [catJAM]'])
    expect(line.reward).toEqual({ title: 'Hydrate', cost: 500, input: 'drink catJAM' })
    expect(plain(toChatLine({ ...n, type: 'raid', payload: {} }).tokens)).toBe('raid')
  })

  it('reads moderation as a notice line', () => {
    const m: LogModeration = {
      kind: 'moderation',
      id: 7,
      at: '2026-09-30T18:00:00Z',
      type: 'timeout',
      message_id: null,
      target: { id: '2', login: 'spammer' },
      moderator: { id: '3', login: 'mod', display_name: 'Mod' },
      duration_s: 600,
      reason: 'spam',
      source: 'eventsub',
    }
    const line = toChatLine(m)
    expect([line.id, line.noticeType, plain(line.tokens)]).toEqual(['mod-7', 'moderation.timeout', 'Mod timed out spammer for 600s: spam'])
  })
})

describe('loadChannelEmotes', () => {
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

  it('loads every provider, channel sets before globals, and skips one that fails', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes('7tv.io/v3/users')) return ok({ emote_set: { emotes: [{ id: 's1', name: 'Same' }] } })
      if (url.includes('7tv.io/v3/emote-sets/global')) return ok({ emotes: [{ id: 's2', name: 'Global7' }] })
      if (url.includes('betterttv.net/3/cached/users')) return ok({ channelEmotes: [{ id: 'b1', code: 'Same' }], sharedEmotes: [] })
      if (url.includes('betterttv.net/3/cached/emotes/global')) return ok([{ id: 'b2', code: 'GlobalB' }])
      return new Response('down', { status: 503 })
    })
    const set = await loadChannelEmotes('41234567', { fetch })
    expect(fetch).toHaveBeenCalledTimes(6)
    expect(set.find('Same')?.provider).toBe('7tv')
    expect(set.find('GlobalB')?.provider).toBe('bttv')
    expect(set.find('Global7')?.provider).toBe('7tv')
  })

  it('rethrows an abort', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const fetch = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    })
    await expect(loadChannelEmotes('1', { fetch, signal: ctrl.signal })).rejects.toThrow()
  })
})
