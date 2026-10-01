<script setup lang="ts">
// One chat line as Twitch shows it: reward, badges, the coloured name, bits, then the text with its emotes. Notices
// (subs, raids, redemptions, moderation) are the text alone, set off; removed messages are struck through with why.
// The `before` slot goes first on the line (a timestamp), the `after` slot last.
import { twitchColor } from '../../chat/color'
import { chatName, removalNote, type ChatLine, type EmoteToken, type NameMode } from '../../chat/message'
import ChatEmote from './ChatEmote.vue'

const props = withDefaults(
  defineProps<{
    line: ChatLine
    badges?: boolean
    /** `readable` lifts dark name colours so they show on a dark background; `raw` keeps the chatter's own. */
    colors?: 'readable' | 'raw'
    names?: NameMode
    /** Emote providers shown as images (missing ones are on). */
    emotes?: Partial<Record<'7tv' | 'bttv' | 'ffz', boolean>>
    /** The emote whose menu is open, for its `aria-expanded`. */
    openToken?: EmoteToken | null
  }>(),
  { badges: true, colors: 'readable', names: 'display', emotes: () => ({}), openToken: null },
)
const emit = defineEmits<{ emoteMenu: [token: EmoteToken, anchor: HTMLElement] }>()

const color = () => twitchColor(props.line.user, props.line.color, props.colors)
const name = () => chatName(props.line.user, props.line.login, props.names)
</script>

<template>
  <div class="vxp-chat-line" :class="{ notice: line.kind === 'notice', removed: line.removed }" :data-notice="line.noticeType ?? undefined">
    <slot name="before" />
    <template v-if="line.kind === 'message'">
      <span v-if="line.reward" class="tag"
        >{{ line.reward.title }}<template v-if="line.reward.cost"> · {{ line.reward.cost }}</template></span
      >
      <span v-if="badges && line.badges.length" class="badges">
        <img v-for="b in line.badges" :key="b.setId" :src="b.src" :srcset="b.srcset" :alt="b.title" :title="b.title" width="18" height="18" loading="lazy" />
      </span>
      <span class="who" :class="{ me: line.action }" :style="{ color: color() }"
        >{{ name().name }}<span v-if="name().login" class="login"> ({{ name().login }})</span></span
      >
      <span v-if="line.bits" class="tag mono">{{ line.bits }} bits</span>
    </template>
    <span class="text" :class="{ me: line.action }" :style="line.action ? { color: color() } : undefined">
      <template v-for="(t, j) in line.tokens" :key="j">
        <ChatEmote v-if="t.kind === 'emote'" :token="t" :enabled="emotes" :open="openToken === t" @menu="emit('emoteMenu', t, $event)" />
        <span v-else>{{ t.text }}</span>
      </template>
    </span>
    <span v-if="line.removed" class="why">{{ removalNote(line.removed) }}</span>
    <slot name="after" />
  </div>
</template>

<style scoped>
.vxp-chat-line { color: var(--vxp-chat-ink); overflow-wrap: anywhere; }
.badges { display: inline-flex; gap: 2px; vertical-align: -3px; margin-right: 4px; }
.badges img { width: 18px; height: 18px; }
.who { font-weight: 700; }
.who::after { content: ':'; color: var(--vxp-chat-muted); margin-right: 5px; }
.who.me::after { content: ''; margin-right: 5px; }
.login { font-weight: 400; color: var(--vxp-chat-muted); }
.text.me { font-style: italic; }
.tag {
  display: inline-block; margin-right: 5px; padding: 0 5px; border-radius: 4px; font-size: 0.85em; line-height: 1.5;
  background: color-mix(in srgb, var(--vxp-accent) 18%, transparent); color: var(--vxp-chat-ink);
}
.mono { font-family: var(--vxp-mono); }
.notice {
  padding: 2px 8px; border-left: 2px solid var(--vxp-accent); background: color-mix(in srgb, var(--vxp-accent) 8%, transparent);
  color: var(--vxp-chat-muted);
}
.removed .text { text-decoration: line-through; opacity: 0.55; }
.why { margin-left: 6px; font-size: 11px; font-style: italic; color: var(--vxp-chat-muted); }
</style>
