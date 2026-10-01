<script setup lang="ts">
// Job runs, newest first: id (linked to the run's page), kind, subject, state, step and when it last changed.
import { stepPosition } from '../../jobs'
import type { JobOut } from '../../types'
import { usePlatformUi } from '../config'
import PlatformLink from './PlatformLink.vue'
import StateChip from './StateChip.vue'
import SubjectLink from './SubjectLink.vue'

withDefaults(defineProps<{ jobs: JobOut[]; empty?: string; label?: string }>(), { empty: 'No jobs.', label: 'Jobs' })
const ui = usePlatformUi()
</script>

<template>
  <div class="vxp vxp-table-scroll">
    <table class="vxp-table jobs" :aria-label="label">
      <thead>
        <tr>
          <th class="id">#</th>
          <th>Kind</th>
          <th>Subject</th>
          <th>State</th>
          <th>Step</th>
          <th class="right">Updated</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!jobs.length">
          <td colspan="6" class="vxp-muted empty">{{ empty }}</td>
        </tr>
        <tr v-for="j in jobs" :key="j.id">
          <td class="vxp-mono id"><PlatformLink :to="ui.jobHref(j.id)">{{ j.id }}</PlatformLink></td>
          <td class="vxp-mono">{{ j.kind }}</td>
          <td><SubjectLink :subject="j.subject" /></td>
          <td><StateChip :state="j.state" :cancelling="j.cancel_requested && j.state === 'running'" /></td>
          <td class="vxp-mono">
            <span v-if="j.state === 'succeeded'" class="vxp-muted">finished</span>
            <template v-else>
              {{ j.step ?? '—' }}
              <span class="vxp-muted">{{ stepPosition(j).index + 1 }}/{{ stepPosition(j).total }}</span>
            </template>
            <div v-if="j.last_error && j.state === 'failed'" class="err" :title="j.last_error">{{ j.last_error }}</div>
          </td>
          <td class="vxp-muted right nowrap" :title="ui.stamp(j.updated_at)">{{ ui.timeAgo(j.updated_at) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.jobs { min-width: 40rem; }
.id { width: 64px; }
.right { text-align: right; }
.nowrap { white-space: nowrap; }
.empty { text-align: center; padding: 24px 10px; }
.err { color: var(--vxp-bad); font-family: var(--vxp-font); font-size: 12px; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
