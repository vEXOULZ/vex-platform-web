// A newest-first list read by cursor: the first page polled (so new rows show up on top), and older pages appended
// on demand from the last page's `next_cursor`.
import { computed, ref, shallowRef } from 'vue'
import { errorText } from '../errors'
import type { Page } from '../types'
import { usePoll } from './usePoll'

/**
 * The first page followed by the older ones, without the rows the first page already has (rows move down into the
 * older pages as new ones arrive while it is polled).
 */
export function mergePages<T>(first: readonly T[], older: readonly T[], key: (row: T) => string | number): T[] {
  const seen = new Set(first.map(key))
  return [...first, ...older.filter((r) => !seen.has(key(r)))]
}

export interface CursorPagesOptions<T> {
  /** Poll the first page this often (ms); 0: load it once. */
  poll?: number
  key?: (row: T) => string | number
}

export function useCursorPages<T>(
  load: (cursor: string | null, signal?: AbortSignal) => Promise<Page<T>>,
  opts: CursorPagesOptions<T> = {},
) {
  const key = opts.key ?? ((r: T) => (r as { id: number }).id)
  const first = usePoll((signal) => load(null, signal), opts.poll ?? 0)
  const older = shallowRef<T[]>([])
  // The cursor after the last loaded page: the first page's until an older page is loaded.
  const olderCursor = ref<string | null | undefined>(undefined)
  const loadingOlder = ref(false)
  const olderError = ref<string | null>(null)

  const items = computed(() => mergePages(first.data.value?.items ?? [], older.value, key))
  const nextCursor = computed(() => (olderCursor.value === undefined ? (first.data.value?.next_cursor ?? null) : olderCursor.value))
  const hasOlder = computed(() => !!first.data.value && nextCursor.value !== null)

  async function loadOlder() {
    const cursor = nextCursor.value
    if (!cursor || loadingOlder.value) return
    loadingOlder.value = true
    try {
      const page = await load(cursor)
      older.value = [...older.value, ...page.items]
      olderCursor.value = page.next_cursor
      olderError.value = null
    } catch (e) {
      olderError.value = errorText(e)
    } finally {
      loadingOlder.value = false
    }
  }

  /** Back to the first page alone (after the filters changed), and reload it. */
  function reset() {
    older.value = []
    olderCursor.value = undefined
    olderError.value = null
    first.data.value = null
    return first.refresh()
  }

  return {
    items,
    /** The first page has loaded at least once. */
    loaded: computed(() => first.data.value !== null),
    error: computed(() => first.error.value ?? olderError.value),
    loading: first.loading,
    loadingOlder,
    hasOlder,
    loadOlder,
    refresh: first.refresh,
    reset,
  }
}
