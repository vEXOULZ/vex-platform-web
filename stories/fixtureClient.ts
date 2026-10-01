// A PlatformClient over the test fixtures, so the stories run without a backend. Writes answer with the job in the
// state the action would leave it in.
import { PlatformClient, type JobOut, type JobState } from '../src'
import audit from '../tests/fixtures/audit.json'
import events from '../tests/fixtures/events.json'
import kinds from '../tests/fixtures/job-kinds.json'
import jobs from '../tests/fixtures/jobs.json'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const after: Record<string, JobState> = { pause: 'paused', resume: 'running', retry: 'queued', cancel: 'cancelled' }

export function fixtureClient(): PlatformClient {
  const rows = jobs.items.map((j) => ({ ...j })) as JobOut[]
  return new PlatformClient({
    base: '/api/v2',
    fetch: async (input, init) => {
      const url = new URL(String(input), 'http://stories')
      const path = url.pathname.replace('/api/v2', '')
      await new Promise((r) => setTimeout(r, 250))
      if (path === '/job-kinds') return json(kinds)
      if (path === '/audit') return json(audit)
      if (path === '/jobs') {
        const states = url.searchParams.getAll('state')
        return json({ items: rows.filter((j) => !states.length || states.includes(j.state)), next_cursor: null })
      }
      const m = path.match(/^\/jobs\/(\d+)(?:\/(\w+))?$/)
      const job = m && rows.find((j) => j.id === Number(m[1]))
      if (!m || !job) return json({ title: 'Not Found', status: 404, code: 'not_found', detail: 'No such job.' }, 404)
      if (m[2] === 'events') return json(url.searchParams.has('cursor') ? { items: [], next_cursor: 'end' } : { ...events, next_cursor: 'end' })
      if (m[2] && after[m[2]]) job.state = after[m[2]]!
      if (init?.method === 'PATCH') Object.assign(job, JSON.parse(String(init.body)))
      return json(job)
    },
  })
}
