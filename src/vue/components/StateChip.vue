<script setup lang="ts">
import { STATE_TONE } from '../../jobs'
import type { JobState } from '../../types'

/** `scheduled`: a queued run's start time still ahead (`scheduledFor`); the chip then reads "scheduled". */
defineProps<{ state: JobState; cancelling?: boolean; scheduled?: string | null }>()
</script>

<template>
  <span class="vxp-chip" :class="cancelling ? 'warn' : STATE_TONE[state]">{{
    cancelling ? 'cancelling…' : scheduled ? 'scheduled' : state
  }}</span>
</template>
