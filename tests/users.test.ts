import { afterEach, describe, expect, it, vi } from 'vitest'
import { accountAge, clearUserCache, loadTwitchUser, parseIvrUser, USER_API } from '../src/chat'
import ivr from './fixtures/ivr-user.json'

const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))

afterEach(() => clearUserCache())

describe('parseIvrUser', () => {
  it('reads ivr.fi v2 user', () => {
    expect(parseIvrUser(ivr)).toEqual({
      id: '40424907',
      login: 'vexoulz',
      displayName: 'vEXOULZ',
      avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png',
      bio: 'Streams and VODs.',
      createdAt: '2013-02-03T10:20:30.123Z',
      followers: 1234,
      color: '#8A2BE2',
      partner: false,
      affiliate: true,
      staff: false,
      bot: false,
      banned: false,
      banReason: null,
    })
  })

  it('is null for an empty answer or one without an id', () => {
    expect(parseIvrUser([])).toBeNull()
    expect(parseIvrUser(null)).toBeNull()
    expect(parseIvrUser([{ login: 'x' }])).toBeNull()
  })

  it('drops a picture that is not https', () => {
    expect(parseIvrUser([{ id: '1', login: 'a', logo: 'javascript:alert(1)' }])?.avatar).toBeNull()
  })
})

describe('loadTwitchUser', () => {
  it('asks by id when it has one, else by login', () => {
    expect(USER_API.ivr({ id: '1', login: 'a' })).toBe('https://api.ivr.fi/v2/twitch/user?id=1')
    expect(USER_API.ivr({ login: 'Some One' })).toBe('https://api.ivr.fi/v2/twitch/user?login=Some%20One')
  })

  it('fetches each user once', async () => {
    const fetch = vi.fn(() => ok(ivr))
    const [a, b] = await Promise.all([loadTwitchUser({ login: 'vexoulz' }, { fetch }), loadTwitchUser({ login: 'VEXOULZ' }, { fetch })])
    expect(a?.id).toBe('40424907')
    expect(b).toBe(a)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('is null for no key or an unknown user, and retries after a failure', async () => {
    expect(await loadTwitchUser({})).toBeNull()
    expect(await loadTwitchUser({ login: 'nobody' }, { fetch: () => ok([]) })).toBeNull()
    await expect(loadTwitchUser({ login: 'flaky' }, { fetch: () => ok({}, 503) })).rejects.toThrow('503')
    expect((await loadTwitchUser({ login: 'flaky' }, { fetch: () => ok(ivr) }))?.login).toBe('vexoulz')
  })

  it('stops waiting when its signal aborts', async () => {
    const c = new AbortController()
    const p = loadTwitchUser({ id: '9' }, { signal: c.signal, fetch: () => new Promise(() => {}) })
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
