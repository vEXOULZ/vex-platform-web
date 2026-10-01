<script setup lang="ts">
// A run's log lines, scrolled to the newest while the reader is at the bottom.
import { nextTick, ref, watch } from 'vue'
import type { EventOut } from '../../types'
import { usePlatformUi } from '../config'

const props = withDefaults(defineProps<{ lines: EventOut[]; empty?: string; error?: string | null; dropped?: number }>(), {
  empty: 'No log lines yet.',
  error: null,
  dropped: 0,
})
const ui = usePlatformUi()

const box = ref<HTMLElement | null>(null)
const follow = ref(true)
watch(
  () => props.lines.length,
  async () => {
    await nextTick()
    const el = box.value
    if (el && follow.value) el.scrollTop = el.scrollHeight
  },
  { immediate: true },
)
function onScroll() {
  const el = box.value
  if (el) follow.value = el.scrollHeight - el.scrollTop - el.clientHeight < 24
}
const time = (iso: string) => new Date(iso).toLocaleTimeString()
</script>

<template>
  <div ref="box" class="vxp log vxp-panel vxp-mono" role="log" aria-live="polite" tabindex="0" @scroll.passive="onScroll">
    <p v-if="error" class="vxp-muted">Couldn't load the log: {{ error }}</p>
    <p v-else-if="!lines.length" class="vxp-muted">{{ empty }}</p>
    <p v-if="dropped" class="vxp-muted">{{ dropped }} older lines not shown.</p>
    <div v-for="e in lines" :key="e.id" class="line" :class="`is-${e.level}`">
      <span class="t" :title="ui.stamp(e.at)">{{ time(e.at) }}</span>
      <span v-if="e.step" class="s">{{ e.step }}</span>
      <span class="m">{{ e.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.log { height: min(60vh, 520px); overflow: auto; padding: 10px 12px; font-size: 12px; line-height: 1.5; }
.log p { margin: 0; }
.line { display: flex; gap: 8px; }
.t { color: var(--vxp-muted); flex: none; }
.s { color: var(--vxp-accent); flex: none; }
.m { white-space: pre-wrap; word-break: break-word; }
.is-debug .m { color: var(--vxp-muted); }
.is-warning .m { color: var(--vxp-warn); }
.is-error .m { color: var(--vxp-bad); }
</style>
