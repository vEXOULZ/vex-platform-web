<script setup lang="ts">
// A `type:id` subject or audit target, linked where the site says it lives.
import { computed } from 'vue'
import { usePlatformUi } from '../config'
import PlatformLink from './PlatformLink.vue'

const props = defineProps<{ subject: string | null | undefined }>()
const ui = usePlatformUi()
const href = computed(() => (props.subject ? ui.subjectHref(props.subject) : null))
</script>

<template>
  <PlatformLink v-if="subject" :to="href" class="vxp-mono">{{ subject }}</PlatformLink>
  <span v-else class="vxp-muted">—</span>
</template>
