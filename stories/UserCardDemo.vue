<script setup lang="ts">
// The chat with user cards, as a site wires it. Its own component so the open card's anchor element stays out of the
// story's state, which Histoire walks deeply.
import { shallowRef } from 'vue'
import type { ChatLine as Line } from '../src/chat'
import { ChatLine, UserCard } from '../src/vue'

defineProps<{ lines: Line[] }>()
const card = shallowRef<{ line: Line; anchor: HTMLElement } | null>(null)
const toggle = (line: Line, anchor: HTMLElement) => (card.value = card.value?.anchor === anchor ? null : { line, anchor })
</script>

<template>
  <ChatLine v-for="l in lines" :key="l.id" :line="l" user-cards :user-open="card?.line === l" @user="toggle" />
  <UserCard v-if="card" :line="card.line" :anchor="card.anchor" @close="card = null">
    <template #actions="{ close }"><button type="button" class="vxp-btn sm" @click="close">Their messages</button></template>
  </UserCard>
</template>
