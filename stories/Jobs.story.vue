<script setup lang="ts">
import { ref } from 'vue'
import { JobDetail, JobsBrowser, JobsTable, type JobFilters } from '../src/vue'
import type { JobOut } from '../src'
import jobs from '../tests/fixtures/jobs.json'
import { fixtureClient } from './fixtureClient'

const client = fixtureClient()
const filters = ref<JobFilters>({ state: 'all', kind: '', subject: '' })
const rows = jobs.items as JobOut[]
</script>

<template>
  <Story title="Jobs" :layout="{ type: 'single', iframe: true }">
    <Variant title="Browser">
      <div class="vxp story-frame"><JobsBrowser v-model:filters="filters" :client="client" subject-hint="vod:" /></div>
    </Variant>
    <Variant title="Table">
      <div class="vxp story-frame"><JobsTable :jobs="rows" /></div>
    </Variant>
    <Variant title="Detail: running">
      <div class="vxp story-frame"><JobDetail :client="client" :id="rows[0]!.id" /></div>
    </Variant>
    <Variant title="Detail: failed">
      <div class="vxp story-frame"><JobDetail :client="client" :id="rows[1]!.id" /></div>
    </Variant>
    <Variant title="Detail: child run">
      <div class="vxp story-frame"><JobDetail :client="client" :id="814" /></div>
    </Variant>
  </Story>
</template>
