<script setup lang="ts">
import { STATE_TONE } from '../../jobs'
import type { JobState } from '../../types'

defineProps<{ state: JobState; cancelling?: boolean }>()
</script>

<template>
  <span class="vxp-chip" :class="cancelling ? 'warn' : STATE_TONE[state]">{{ cancelling ? 'cancelling…' : state }}</span>
</template>
