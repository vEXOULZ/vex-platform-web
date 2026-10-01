<script setup lang="ts">
// The audit log with filters (action, target, who, actor kind, outcome) and older pages on demand. Scoped to one
// channel when `scope` is set. The filters are a v-model, so the site can keep them in its URL; they apply on submit.
import { reactive, watch } from 'vue'
import { auditFilterQuery } from '../../audit'
import type { PlatformClient } from '../../client'
import type { AuditFilters } from '../types'
import { useCursorPages } from '../useCursorPages'
import AuditTable from './AuditTable.vue'

const props = withDefaults(
  defineProps<{
    client: PlatformClient
    /** Only this scope's rows (a channel id); also hides the Where column. */
    scope?: string | null
    scopeNames?: Record<string, string>
    pageSize?: number
    /** Poll the first page this often (ms); 0: only on Refresh. */
    poll?: number
    /** Placeholders that fit the app: `vod.` / `vod:`. */
    actionHint?: string
    targetHint?: string
  }>(),
  { scope: null, scopeNames: () => ({}), pageSize: 50, poll: 0, actionHint: 'job. or job.cancel', targetHint: 'job: or job:12' },
)
const filters = defineModel<AuditFilters>('filters', {
  default: () => ({ action: '', target: '', actor: '', actor_kind: '', outcome: '', scope: '' }),
})

const form = reactive({ ...filters.value })
watch(filters, (f) => Object.assign(form, f), { deep: true })
const search = () => (filters.value = { ...form })

const pages = useCursorPages(
  (cursor, signal) =>
    props.client.audit({ ...auditFilterQuery(filters.value), scope: props.scope || filters.value.scope || undefined, cursor, limit: props.pageSize }, signal),
  { poll: props.poll },
)
watch([filters, () => props.scope], () => pages.reset(), { deep: true })

defineExpose({ refresh: pages.refresh })
</script>

<template>
  <div class="vxp browser">
    <form class="filters" @submit.prevent="search">
      <label class="vxp-field">By<input v-model="form.actor" class="vxp-input vxp-mono" placeholder="login, or me" /></label>
      <label class="vxp-field grow">Action<input v-model="form.action" class="vxp-input vxp-mono" :placeholder="actionHint" /></label>
      <label class="vxp-field grow">Target<input v-model="form.target" class="vxp-input vxp-mono" :placeholder="targetHint" /></label>
      <label class="vxp-field">
        Actor kind
        <select v-model="form.actor_kind" class="vxp-input">
          <option value="">Any</option>
          <option value="user">user</option>
          <option value="api_key">api_key</option>
          <option value="system">system</option>
          <option value="job">job</option>
          <option value="anonymous">anonymous</option>
        </select>
      </label>
      <label class="vxp-field">
        Outcome
        <select v-model="form.outcome" class="vxp-input">
          <option value="">Any</option>
          <option value="ok">ok</option>
          <option value="denied">denied</option>
          <option value="failed">failed</option>
        </select>
      </label>
      <div class="buttons">
        <button type="submit" class="vxp-btn primary">Filter</button>
        <button type="button" class="vxp-btn" :aria-busy="pages.loading.value" @click="pages.refresh">Refresh</button>
      </div>
    </form>

    <div v-if="pages.error.value" class="vxp-callout error" role="alert">
      <strong>Couldn't load the audit log</strong>
      {{ pages.error.value }}
      <div><button type="button" class="vxp-btn sm retry" @click="pages.refresh">Try again</button></div>
    </div>
    <div v-if="!pages.loaded.value && !pages.error.value" class="sk" aria-busy="true">
      <div v-for="i in 8" :key="i" class="vxp-skeleton" />
    </div>
    <template v-else-if="pages.loaded.value">
      <AuditTable :entries="pages.items.value" :scope-names="scopeNames" :hide-scope="!!scope" empty="No audit rows match these filters.">
        <template v-if="$slots.actor" #actor="s"><slot name="actor" v-bind="s" /></template>
        <template v-if="$slots.scope" #scope="s"><slot name="scope" v-bind="s" /></template>
      </AuditTable>
      <div class="more">
        <button v-if="pages.hasOlder.value" type="button" class="vxp-btn" :disabled="pages.loadingOlder.value" :aria-busy="pages.loadingOlder.value" @click="pages.loadOlder">
          Older
        </button>
        <span class="vxp-muted vxp-mono vxp-small">{{ pages.items.value.length }} shown</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.browser { display: flex; flex-direction: column; gap: 12px; }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; }
.filters .vxp-field { flex: 0 1 150px; }
.filters .grow { flex: 1 1 180px; }
.buttons { display: flex; gap: 8px; }
.retry { margin-top: 8px; }
.sk { display: flex; flex-direction: column; gap: 6px; }
.sk .vxp-skeleton { height: 38px; }
.more { display: flex; flex-direction: column; align-items: center; gap: 6px; }
</style>
