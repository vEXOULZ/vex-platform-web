<script setup lang="ts">
// A link through the site's router link when it gave one, else a plain <a>; just the text when there's nowhere to go.
import { usePlatformUi } from '../config'

defineProps<{ to: string | null | undefined }>()
const ui = usePlatformUi()
</script>

<template>
  <span v-if="!to"><slot /></span>
  <component :is="ui.link" v-else-if="ui.link" :to="to"><slot /></component>
  <a v-else :href="to"><slot /></a>
</template>
