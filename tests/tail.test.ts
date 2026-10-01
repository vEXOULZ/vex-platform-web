import { describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { PlatformClient, type EventOut } from '../src'
import { useEventTail } from '../src/vue'
import events from './fixtures/events.json'

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('useEventTail', () => {
  it('follows the cursor and drops events it already has', async () => {
    const all = events.items as EventOut[]
    // The second read overlaps the first by one event, as a retried request might; a full page reads on.
    const pages = [
      { items: all.slice(0, 3), next_cursor: 'a' },
      { items: all.slice(2, 5), next_cursor: 'b' },
      { items: [], next_cursor: 'b' },
    ]
    const fetch = vi.fn(async (_url: string) => json(pages.shift() ?? { items: [], next_cursor: 'b' }))
    const client = new PlatformClient({ base: '/api/v2', fetch })
    let tail!: ReturnType<typeof useEventTail>
    const app = createApp(defineComponent({ setup: () => ((tail = useEventTail(client, () => 1, { limit: 3, live: () => false })), () => h('div')) }))
    app.mount(document.createElement('div'))
    for (let i = 0; i < 5; i++) await flush()
    expect(tail.events.value.map((e) => e.id)).toEqual([1, 2, 3, 4, 5])
    expect(fetch.mock.calls.map((c) => String(c[0]))).toEqual([
      '/api/v2/jobs/1/events?limit=3',
      '/api/v2/jobs/1/events?cursor=a&limit=3',
      '/api/v2/jobs/1/events?cursor=b&limit=3',
    ])
    app.unmount()
    await nextTick()
  })
})
