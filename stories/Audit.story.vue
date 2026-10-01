<script setup lang="ts">
import { ref } from 'vue'
import { AuditBrowser, AuditTable, type AuditFilters } from '../src/vue'
import type { AuditOut } from '../src'
import audit from '../tests/fixtures/audit.json'
import { fixtureClient } from './fixtureClient'

const client = fixtureClient()
const filters = ref<AuditFilters>({ action: '', target: '', actor: '', actor_kind: '', outcome: '', scope: '' })
const entries = audit.items as AuditOut[]
</script>

<template>
  <Story title="Audit" :layout="{ type: 'single', iframe: true }">
    <Variant title="Browser">
      <div class="vxp story-frame"><AuditBrowser v-model:filters="filters" :client="client" action-hint="job." target-hint="vod:" /></div>
    </Variant>
    <Variant title="Table">
      <div class="vxp story-frame"><AuditTable :entries="entries" /></div>
    </Variant>
  </Story>
</template>
