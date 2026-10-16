import { describe, expect, it, vi } from 'vitest'
import { accountAge, parseTwitchUser, twitchUserLookup, userQuery } from '../src/chat'
import fixture from './fixtures/twitch-user.json'

const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))
const URL = '/api/v2/twitch/users'

describe('parseTwitchUser', () => {
  it("reads doomtp-bot's /api/v2/twitch/users", () => {
    expect(parseTwitchUser(fixture)).toEqual({
      id: '40424907',
      login: 'vexoulz',
      displayName: 'vEXOULZ',
      avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png',
      bio: 'Streams and VODs.',
      createdAt: '2013-02-03T10:20:30Z',
      broadcasterType: 'affiliate',
      staff: false,
    })
    expect(parseTwitchUser({ ...fixture, type: 'global_mod', broadcaster_type: 'partner' })).toMatchObject({ staff: true, broadcasterType: 'partner' })
  })

  it('is null for something that is not a user, and drops a picture that is not https', () => {
    expect(parseTwitchUser(null)).toBeNull()
    expect(parseTwitchUser({ login: 'x' })).toBeNull()
    expect(parseTwitchUser({ id: '1', login: 'a', profile_image_url: 'javascript:alert(1)' })?.avatar).toBeNull()
  })
})

describe('twitchUserLookup', () => {
  it('asks by id when it has one, else by login', () => {
    expect(userQuery({ id: '1', login: 'a' })).toBe('id=1')
    expect(userQuery({ login: 'Some_One' })).toBe('login=some_one')
  })

  it('fetches each user once, without cookies', async () => {
    const fetch = vi.fn((_url: string, _init?: RequestInit) => ok(fixture))
    const look = twitchUserLookup(URL, { fetch })
    const [a, b] = await Promise.all([look({ login: 'vexoulz' }), look({ login: 'VEXOULZ' })])
    expect(a?.id).toBe('40424907')
    expect(b).toBe(a)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toBe('/api/v2/twitch/users?login=vexoulz')
    expect(fetch.mock.calls[0]![1]?.credentials).toBe('omit')
  })

  it('is null for no key or a 404, and retries after a failure', async () => {
    const look = twitchUserLookup(URL, { fetch: () => ok({ code: 'not_found' }, 404) })
    expect(await look({})).toBeNull()
    expect(await look({ id: '9' })).toBeNull()
    let down = true
    const flaky = twitchUserLookup(URL, { fetch: () => (down ? ok({}, 503) : ok(fixture)) })
    await expect(flaky({ id: '40424907' })).rejects.toThrow('503')
    down = false
    expect((await flaky({ id: '40424907' }))?.login).toBe('vexoulz')
  })

  it('stops waiting when its signal aborts', async () => {
    const c = new AbortController()
    const p = twitchUserLookup(URL, { fetch: () => new Promise(() => {}) })({ id: '9' }, { signal: c.signal })
    c.abort()
    await expect(p).rejects.toThrow('Aborted')
  })
})

describe('accountAge', () => {
  const now = Date.parse('2026-10-16T00:00:00Z')
  it('gives the largest whole unit', () => {
    expect(accountAge('2013-02-03T00:00:00Z', now)).toBe('13 years')
    expect(accountAge('2026-07-01T00:00:00Z', now)).toBe('3 months')
    expect(accountAge('2026-10-15T00:00:00Z', now)).toBe('1 day')
    expect(accountAge(null, now)).toBeNull()
  })
})
