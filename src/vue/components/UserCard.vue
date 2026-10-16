<script setup lang="ts">
// The card a chatter's name opens (`ChatLine` with `userCards`): what the chat line knows straight away (name, login,
// colour, the badges they wore, their id when the source has it), then their public Twitch profile (picture, id,
// when the account was made, followers, roles, bio) once the site's `userLookup` answers. The `actions` slot adds the
// site's own buttons (show their messages, …) next to the link to their channel.
// One card serves the whole chat: it sits under the name (or above, with more room there), kept on screen, and closes
// on Escape, a press outside, or once the name scrolls out of view.
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { twitchColor } from '../../chat/color'
import type { ChatLine } from '../../chat/message'
import { accountAge, type TwitchUser } from '../../chat/users'
import { errorText } from '../../errors'
import { usePlatformUi } from '../config'

const props = withDefaults(
  defineProps<{
    line: ChatLine
    anchor: HTMLElement
    colors?: 'readable' | 'raw'
    /** The element whose view the name must stay in; default the anchor's nearest scrolling parent. */
    bounds?: HTMLElement | null
  }>(),
  { colors: 'readable', bounds: null },
)
const emit = defineEmits<{ close: [] }>()
defineSlots<{ actions?: (p: { user: TwitchUser | null; line: ChatLine; close: () => void }) => unknown }>()

const ui = usePlatformUi()
const user = shallowRef<TwitchUser | null>(null)
const state = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
const error = ref('')
const copied = ref(false)
const broken = ref(false)

const key = computed(() => ({ id: props.line.userId ?? null, login: props.line.login }))
const canLook = computed(() => !!(key.value.id || key.value.login))

let ctrl: AbortController | null = null
async function look() {
  ctrl?.abort()
  user.value = null
  copied.value = false
  broken.value = false
  if (!canLook.value) return void (state.value = 'missing')
  state.value = 'loading'
  const c = (ctrl = new AbortController())
  try {
    const u = await ui.userLookup(key.value, { signal: c.signal })
    if (c.signal.aborted) return
    user.value = u
    state.value = u ? 'ok' : 'missing'
  } catch (e) {
    if (c.signal.aborted) return
    error.value = errorText(e)
    state.value = 'error'
  }
}

const name = computed(() => user.value?.displayName || props.line.user)
const login = computed(() => user.value?.login ?? props.line.login)
const id = computed(() => user.value?.id ?? props.line.userId ?? null)
const color = computed(() => twitchColor(props.line.user, props.line.color ?? user.value?.color, props.colors))
const initial = computed(() => (name.value.trim()[0] ?? '?').toUpperCase())
const created = computed(() => {
  const at = user.value?.createdAt
  if (!at) return null
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return null
  return { date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), age: accountAge(at) }
})
const roles = computed(() => {
  const u = user.value
  if (!u) return []
  return [u.staff && 'Staff', u.partner && 'Partner', !u.partner && u.affiliate && 'Affiliate', u.bot && 'Verified bot'].filter(Boolean) as string[]
})
const twitchHref = computed(() => (login.value ? `https://www.twitch.tv/${encodeURIComponent(login.value)}` : null))
const fmt = new Intl.NumberFormat()

async function copyId() {
  if (!id.value) return
  try {
    await navigator.clipboard.writeText(id.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    ui.notify("Couldn't copy the id", 'error')
  }
}

const panel = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })
const close = () => emit('close')

// Under the name (above it when there's more room there), kept on screen sideways. Runs every frame while open, so it
// follows the name while chat scrolls; only a move re-renders.
function follow() {
  const a = props.anchor
  const view = props.bounds ?? scroller(a)
  if (!a.isConnected) return close()
  const r = a.getBoundingClientRect()
  if (view) {
    const v = view.getBoundingClientRect()
    if (r.bottom < v.top || r.top > v.bottom) return close()
  }
  const h = panel.value?.offsetHeight ?? 0
  const w = panel.value?.offsetWidth ?? 0
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  const below = vh - r.bottom
  const top = below >= h + 12 || below >= r.top ? Math.min(r.bottom + 6, vh - h - 8) : Math.max(r.top - 6 - h, 8)
  const left = Math.max(8, Math.min(r.left, vw - w - 8))
  const p = pos.value
  if (p.top !== top || p.left !== left) pos.value = { top, left }
}
function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if (o === 'auto' || o === 'scroll') return p
  }
  return null
}
let frame = 0
const loop = () => {
  follow()
  frame = requestAnimationFrame(loop)
}

// A press on the name that opened the card is left to its own click, which closes it.
function outside(e: PointerEvent) {
  const t = e.target as Node
  if (!panel.value?.contains(t) && !props.anchor.contains(t)) close()
}
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  close()
  props.anchor.focus()
}

watch(
  () => [props.anchor, props.line] as const,
  async () => {
    cancelAnimationFrame(frame)
    look()
    await nextTick()
    loop()
    panel.value?.focus({ preventScroll: true })
  },
  { immediate: true },
)
document.addEventListener('pointerdown', outside)
document.addEventListener('keydown', onKey)
onUnmounted(() => {
  ctrl?.abort()
  cancelAnimationFrame(frame)
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="panel"
      class="vxp vxp-user-card"
      role="dialog"
      :aria-label="`${name} on Twitch`"
      tabindex="-1"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
    >
      <div class="head">
        <span class="avatar" :style="{ '--c': color }">
          <img v-if="user?.avatar && !broken" :src="user.avatar" alt="" width="56" height="56" @error="broken = true" />
          <span v-else-if="state === 'loading'" class="vxp-skeleton fill" aria-hidden="true"></span>
          <span v-else class="initial" aria-hidden="true">{{ initial }}</span>
        </span>
        <div class="names">
          <strong class="name" :style="{ color }">{{ name }}</strong>
          <span v-if="login && login.toLowerCase() !== name.toLowerCase()" class="vxp-muted login">{{ login }}</span>
          <span v-if="roles.length || user?.banned" class="chips">
            <span v-if="user?.banned" class="vxp-chip bad" :title="user.banReason ?? undefined">Suspended</span>
            <span v-for="r in roles" :key="r" class="vxp-chip accent">{{ r }}</span>
          </span>
        </div>
        <button type="button" class="vxp-btn sm icon" aria-label="Close" @click="close">✕</button>
      </div>

      <dl class="facts">
        <div>
          <dt>ID</dt>
          <dd v-if="id" class="id">
            <span class="vxp-mono">{{ id }}</span>
            <button type="button" class="vxp-btn sm" @click="copyId">{{ copied ? 'Copied' : 'Copy' }}</button>
          </dd>
          <dd v-else-if="state === 'loading'" class="vxp-muted">…</dd>
          <dd v-else class="vxp-muted">Unknown</dd>
        </div>
        <div v-if="created">
          <dt>Joined</dt>
          <dd>{{ created.date }}<span v-if="created.age" class="vxp-muted"> · {{ created.age }} ago</span></dd>
        </div>
        <div v-if="user?.followers != null">
          <dt>Followers</dt>
          <dd>{{ fmt.format(user.followers) }}</dd>
        </div>
        <div v-if="line.badges.length">
          <dt>Badges</dt>
          <dd class="badges">
            <img v-for="b in line.badges" :key="b.setId" :src="b.src" :srcset="b.srcset" :alt="b.title" :title="b.title" width="18" height="18" loading="lazy" />
          </dd>
        </div>
      </dl>

      <p v-if="user?.bio" class="bio">{{ user.bio }}</p>
      <p v-else-if="state === 'missing'" class="note vxp-muted">
        {{
          line.userId ? 'Twitch no longer has this account.'
          : canLook ? 'Twitch has no account by this name now: it may have been renamed or deleted.'
          : "This chat doesn't say who this is on Twitch."
        }}
      </p>
      <p v-else-if="state === 'error'" class="note vxp-muted">Couldn't load their Twitch profile: {{ error }}</p>

      <div class="actions">
        <slot name="actions" :user="user" :line="line" :close="close" />
        <a v-if="twitchHref" class="vxp-btn sm" :href="twitchHref" target="_blank" rel="noopener noreferrer">Twitch profile ↗</a>
        <button v-if="state === 'error'" type="button" class="vxp-btn sm" @click="look">Retry</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vxp-user-card {
  position: fixed; z-index: 40; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;
  width: min(300px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow-y: auto; padding: 12px;
  background: var(--vxp-surface); color: var(--vxp-ink); border: 1px solid var(--vxp-line); border-radius: var(--vxp-radius);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.35); font-size: 13px; line-height: 1.4; outline: none;
}
.head { display: flex; align-items: flex-start; gap: 10px; }
.avatar {
  flex: none; display: grid; place-items: center; width: 56px; height: 56px; overflow: hidden; border-radius: 50%;
  background: color-mix(in srgb, var(--c) 22%, var(--vxp-bg)); border: 2px solid var(--c);
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar .fill { width: 100%; height: 100%; border-radius: 0; }
.initial { font-size: 22px; font-weight: 700; color: var(--c); }
.names { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding-top: 2px; }
.name { font-size: 15px; overflow-wrap: anywhere; }
.login { font-size: 12px; overflow-wrap: anywhere; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.icon { flex: none; width: var(--vxp-ctl-sm); padding: 0; }
.facts { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 0; }
.facts > div { display: contents; }
.facts dt { color: var(--vxp-muted); font-size: 12px; line-height: var(--vxp-ctl-sm); }
.facts dd { margin: 0; min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-height: var(--vxp-ctl-sm); overflow-wrap: anywhere; }
.id .vxp-mono { user-select: all; }
.badges { gap: 3px; }
.badges img { width: 18px; height: 18px; }
.bio { margin: 0; white-space: pre-line; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
.note { margin: 0; font-size: 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; }
.actions a.vxp-btn { text-decoration: none; }
</style>
