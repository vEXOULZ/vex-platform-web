// A run's event log, followed: each poll reads on from the last `next_cursor` and appends, keeping the newest `max`.
import { computed, shallowRef, watch } from 'vue'
import type { PlatformClient } from '../client'
import { logLines as visibleLines } from '../jobs'
import type { EventOut } from '../types'
import { usePoll } from './usePoll'

export interface EventTailOptions {
  /** Poll interval while `live()` (ms). */
  poll?: number
  /** Whether the run can still write events; once false, polling stops after one more read. */
  live?: () => boolean
  /** Events kept; older ones are dropped. */
  max?: number
  /** Events per request. */
  limit?: number
}

export function useEventTail(client: PlatformClient, id: () => number, opts: EventTailOptions = {}) {
  const max = opts.max ?? 2000
  const limit = opts.limit ?? 200
  const events = shallowRef<EventOut[]>([])
  const dropped = shallowRef(0)
  let cursor: string | null = null
  let reading = id()

  const poll = usePoll(
    async (signal) => {
      const run = id()
      // Read until a short page: a run that wrote a lot since the last poll catches up at once.
      for (let i = 0; i < 20; i++) {
        const page = await client.events(run, cursor, limit, signal)
        if (run !== reading) return null
        // Event ids only grow; a page that overlaps what was read (a retried request) adds only the new ones.
        const last = events.value.at(-1)?.id ?? -Infinity
        const fresh = page.items.filter((e) => e.id > last)
        if (fresh.length) {
          const all = [...events.value, ...fresh]
          if (all.length > max) dropped.value += all.length - max
          events.value = all.slice(-max)
        }
        cursor = page.next_cursor
        if (page.items.length < limit) break
      }
      return null
    },
    () => (opts.live?.() === false ? 0 : (opts.poll ?? 3000)),
  )

  watch(id, (next) => {
    reading = next
    cursor = null
    events.value = []
    dropped.value = 0
    poll.refresh()
  })

  return {
    events,
    /** Events with progress reports thinned to the newest of each run of them. */
    lines: computed(() => visibleLines(events.value)),
    /** The newest event with progress. */
    progress: computed(() => events.value.findLast((e) => e.progress) ?? null),
    /** How many old events were dropped to stay under `max`. */
    dropped,
    error: poll.error,
    refresh: poll.refresh,
  }
}
