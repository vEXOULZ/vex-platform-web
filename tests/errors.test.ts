import { describe, expect, it } from 'vitest'
import { ProblemError, errorText, parseRetryAfter } from '../src'
import conflict from './fixtures/problem-conflict.json'
import invalid from './fixtures/problem-invalid.json'
import v1 from './fixtures/v1-error.json'
import fastapi from './fixtures/v1-fastapi-422.json'

const NOW = Date.parse('2026-10-09T12:00:00Z')

const res = (body: unknown, status: number, headers: Record<string, string> = {}, statusText = '') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, statusText, headers })

describe('ProblemError', () => {
  it('reads a v2 problem and keeps the fields it does not know in extra', async () => {
    const e = await ProblemError.from(res(conflict, 409))
    expect([e.message, e.code, e.title, e.detail, e.requestId]).toEqual([
      'Undo would discard edits made since.',
      'edited_since',
      'Conflict',
      'Undo would discard edits made since.',
      'req_7f3a9c',
    ])
    expect(e.extra).toEqual({ edited: ['123.title', '123.games'], blockedBy: 811 })
    expect(e.body).toEqual(conflict)
  })

  it('reads a v2 validation failure', async () => {
    const e = await ProblemError.from(res(invalid, 422))
    expect(e.code).toBe('invalid')
    expect(e.errors.map((f) => f.msg)).toEqual(['unknown step', 'must be at most 200'])
    expect(e.extra).toEqual({})
    expect(errorText(e)).toBe('The request is invalid.: step unknown step; limit must be at most 200')
  })

  it('reads a v1 {msg} body, extras included', async () => {
    const e = await ProblemError.from(res(v1, 400))
    expect([e.message, e.code, e.errors]).toEqual(['Split point is inside an upload', null, []])
    expect(e.extra).toEqual({ validPoints: [{ at: 3600, part: 2 }] })
  })

  it('reads {message}, {error} and FastAPI detail lists', () => {
    expect(new ProblemError(404, { name: 'NotFound', message: 'No record found', code: 404 }).message).toBe('No record found')
    expect(new ProblemError(500, { error: 'Failed to retrieve comments' }).message).toBe('Failed to retrieve comments')
    expect(new ProblemError(422, fastapi).message).toBe("String should have at most 3 characters; Input should be 'free' or 'plus'")
  })

  it('falls back to the status line', async () => {
    expect((await ProblemError.from(res('<html>bad gateway</html>', 502, {}, 'Bad Gateway'))).message).toBe('HTTP 502 Bad Gateway')
    expect(new ProblemError(503).message).toBe('HTTP 503')
    expect(new ProblemError(500, { title: 'Internal Server Error' }).message).toBe('Internal Server Error')
  })
})

describe('Retry-After', () => {
  it('reads seconds', async () => {
    expect((await ProblemError.from(res({ msg: 'Too many attempts' }, 429, { 'retry-after': '300' }))).retryAfter).toBe(300)
    expect(parseRetryAfter('0')).toBeNull()
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
  })

  it('reads an HTTP date', async () => {
    const e = await ProblemError.from(res({}, 429, { 'retry-after': 'Fri, 09 Oct 2026 12:02:30 GMT' }), NOW)
    expect(e.retryAfter).toBe(150)
    expect(parseRetryAfter('Fri, 09 Oct 2026 11:59:00 GMT', NOW)).toBeNull()
  })

  it('formats it for a login page', () => {
    expect(new ProblemError(429, {}, 300).retryAfterText()).toBe('Try again in 5 min.')
    expect(new ProblemError(429, {}, 61).retryAfterText()).toBe('Try again in 2 min.')
    expect(new ProblemError(429, {}, 20).retryAfterText()).toBe('Try again in 1 min.')
    expect(new ProblemError(429).retryAfterText()).toBe('Try again in a few minutes.')
  })
})

describe('errorText', () => {
  it('gives a message for any thrown value', () => {
    expect(errorText(new ProblemError(400, { msg: 'nope' }))).toBe('nope')
    expect(errorText(new TypeError('Failed to fetch'))).toBe('Failed to fetch')
    expect(errorText('plain')).toBe('plain')
    expect(errorText(undefined)).toBe('undefined')
  })
})
