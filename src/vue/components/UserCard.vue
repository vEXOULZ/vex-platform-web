<script setup lang="ts">
// The card a chatter's name opens (`ChatLine` with `userCards`), kept small: picture, name and login, partner /
// affiliate / staff, the Twitch id (copyable) and when the account was made, a two-line bio, the badges they wore,
// and a link to their channel. What the chat line knows shows at once; the profile fills in once the site's
// `userLookup` answers (without one, the card is the chat line's facts alone). The `actions` slot adds the site's own
// buttons (show their messages, …).
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
const state = ref<'idle' | 'loading' | 'ok' | 'missing' | 'error'>('idle')
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
  const lookup = ui.userLookup
  if (!lookup) return void (state.value = 'idle')
  if (!canLook.value) return void (state.value = 'missing')
  state.value = 'loading'
  const c = (ctrl = new AbortController())
  try {
    const u = await lookup(key.value, { signal: c.signal })
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
const color = computed(() => twitchColor(props.line.user, props.line.color, props.colors))
const initial = computed(() => (name.value.trim()[0] ?? '?').toUpperCase())
const created = computed(() => {
  const at = user.value?.createdAt
  if (!at) return null
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return null
  return { date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }), age: accountAge(at), full: d.toLocaleString() }
})
const roles = computed(() => {
  const u = user.value
  if (!u) return []
  const kind = u.broadcasterType === 'partner' ? 'Partner' : u.broadcasterType === 'affiliate' ? 'Affiliate' : null
  return [u.staff && 'Staff', kind].filter(Boolean) as string[]
})
const twitchHref = computed(() => (login.value ? `https://www.twitch.tv/${encodeURIComponent(login.value)}` : null))

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
          <img v-if="user?.avatar && !broken" :src="user.avatar" alt="" width="36" height="36" @error="broken = true" />
          <span v-else-if="state === 'loading'" class="vxp-skeleton fill" aria-hidden="true"></span>
          <span v-else class="initial" aria-hidden="true">{{ initial }}</span>
        </span>
        <div class="names">
          <div class="line1">
            <strong class="name" :style="{ color }">{{ name }}</strong>
            <span v-for="r in roles" :key="r" class="role">{{ r }}</span>
          </div>
          <div class="line2 vxp-muted">
            <span v-if="login && login.toLowerCase() !== name.toLowerCase()">{{ login }}</span>
            <span v-if="created" :title="`Account made ${created.full}`">joined {{ created.date }}<template v-if="created.age"> · {{ created.age }}</template></span>
          </div>
        </div>
        <button type="button" class="vxp-btn sm sq" aria-label="Close" title="Close" @click="close">✕</button>
      </div>

      <p v-if="user?.bio" class="bio" :title="user.bio">{{ user.bio }}</p>
      <p v-else-if="state === 'missing'" class="note vxp-muted">
        {{
          line.userId ? 'Twitch no longer has this account.'
          : canLook ? 'No Twitch account by this name now (renamed or deleted?).'
          : "This chat doesn't say who this is on Twitch."
        }}
      </p>
      <p v-else-if="state === 'error'" class="note vxp-muted">
        Couldn't load their profile: {{ error }} <button type="button" class="vxp-btn sm" @click="look">Retry</button>
      </p>

      <div class="foot">
        <span v-if="id" class="id"
          ><span class="vxp-muted">ID</span> <span class="vxp-mono">{{ id }}</span>
          <button type="button" class="vxp-btn sm sq" :aria-label="copied ? 'Copied' : 'Copy ID'" :title="copied ? 'Copied' : 'Copy ID'" @click="copyId">
            {{ copied ? '✓' : '⧉' }}
          </button></span
        >
        <span v-if="line.badges.length" class="badges">
          <img v-for="b in line.badges" :key="b.setId" :src="b.src" :srcset="b.srcset" :alt="b.title" :title="b.title" width="18" height="18" loading="lazy" />
        </span>
        <span class="actions">
          <slot name="actions" :user="user" :line="line" :close="close" />
          <a v-if="twitchHref" class="vxp-btn sm" :href="twitchHref" target="_blank" rel="noopener noreferrer">Twitch ↗</a>
        </span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vxp-user-card {
  position: fixed; z-index: 40; display: flex; flex-direction: column; gap: 6px; box-sizing: border-box;
  width: min(280px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow-y: auto; padding: 8px 10px;
  background: var(--vxp-surface); color: var(--vxp-ink); border: 1px solid var(--vxp-line); border-radius: var(--vxp-radius);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.35); font-size: 12px; line-height: 1.35; outline: none;
}
.head { display: flex; align-items: center; gap: 8px; }
.avatar {
  flex: none; display: grid; place-items: center; width: 36px; height: 36px; overflow: hidden; border-radius: 50%;
  background: color-mix(in srgb, var(--c) 22%, var(--vxp-bg)); box-shadow: 0 0 0 2px var(--c);
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar .fill { width: 100%; height: 100%; border-radius: 0; }
.initial { font-size: 16px; font-weight: 700; color: var(--c); }
.names { flex: 1; min-width: 0; }
.line1 { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.name { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role { flex: none; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--vxp-accent); }
.line2 { display: flex; flex-wrap: wrap; gap: 0 8px; font-size: 11.5px; }
.sq { flex: none; width: var(--vxp-ctl-sm); padding: 0; }
.foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; min-height: var(--vxp-ctl-sm); }
.id { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.id .vxp-mono { user-select: all; overflow-wrap: anywhere; }
.badges { display: inline-flex; flex-wrap: wrap; gap: 2px; }
.badges img { width: 18px; height: 18px; }
.bio {
  margin: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.note { margin: 0; font-size: 11.5px; }
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; margin-left: auto; }
.actions a.vxp-btn { text-decoration: none; }
</style>
