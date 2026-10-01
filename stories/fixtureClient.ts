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
  const base = jobs.items.map((j) => ({ ...j })) as JobOut[]
  const backfill = base.find((j) => j.kind === 'chat_backfill')!
  const child = (id: number, parent: number, subject: string, state: JobState): JobOut => ({
    ...backfill,
    id,
    kind: 'bot_chat',
    subject,
    state,
    parent_id: parent,
    last_error: state === 'failed' ? backfill.last_error : null,
    actor: { kind: 'job', id: String(parent), login: backfill.kind, via: 'job' },
  })
  const rows: JobOut[] = [
    ...base,
    child(813, backfill.id, 'vod:2551230001', 'succeeded'),
    child(814, backfill.id, 'vod:2551230002', 'failed'),
    child(815, 814, 'vod:2551230002', 'queued'),
    { ...backfill, id: 790, state: 'succeeded', last_error: null, parent_id: null },
  ]
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
        const subject = url.searchParams.get('subject')
        const parent = url.searchParams.get('parent')
        const items = rows
          .filter((j) => (!states.length || states.includes(j.state)) && (!subject || j.subject === subject))
          .filter((j) => !parent || j.parent_id === Number(parent))
          .sort((a, b) => b.id - a.id)
        return json({ items, next_cursor: null })
      }
      const m = path.match(/^\/jobs\/(\d+)(?:\/(\w+))?$/)
      const job = m && rows.find((j) => j.id === Number(m[1]))
      if (!m || !job) return json({ title: 'Not Found', status: 404, code: 'not_found', detail: 'No such job.' }, 404)
      if (m[2] === 'related') {
        let root = job
        while (root.parent_id) root = rows.find((j) => j.id === root.parent_id) ?? root
        const tree = new Set([root.id])
        for (const j of [...rows].sort((a, b) => a.id - b.id)) if (j.parent_id && tree.has(j.parent_id)) tree.add(j.id)
        return json({ root_id: root.id, items: rows.filter((j) => tree.has(j.id)).sort((a, b) => a.id - b.id), truncated: false })
      }
      if (m[2] === 'events') return json(url.searchParams.has('cursor') ? { items: [], next_cursor: 'end' } : { ...events, next_cursor: 'end' })
      if (m[2] && after[m[2]]) job.state = after[m[2]]!
      if (init?.method === 'PATCH') Object.assign(job, JSON.parse(String(init.body)))
      return json(job)
    },
  })
}
