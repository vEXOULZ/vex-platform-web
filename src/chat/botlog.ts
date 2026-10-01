// doomtp-bot's v2 chat log (`GET /api/v2/channels/{login}/log`) and its entries as chat lines.
import type { EmoteSet } from './emotes'
import { resolveBadges, tokenize, type ChatLine, type Removal, type Token } from './message'
import type { RawBadges, RawFragment, RawUserBadge } from './types'

export interface LogUser {
  id: string
  login: string | null
  display_name?: string | null
}

export interface LogCommandRun {
  ref: string | null
  trigger_type: string | null
  trigger_id: string | null
  expr: string | null
  code: unknown
  message: string | null
}

export interface LogMessage {
  kind: 'message'
  id: string
  /** ISO 8601. */
  at: string
  user: LogUser | null
  text: string
  fragments: (RawFragment & { mention?: { id: string; login: string } | null; cheermote?: unknown })[]
  badges: (RawUserBadge & { info?: string })[]
  color: string | null
  bits: number
  message_type: string
  reply_parent_id: string | null
  reply_parent_user: LogUser | null
  reward_id: string | null
  source_channel_id: string | null
  is_self: boolean
  is_command: boolean
  source: string
  received_at: string | null
  deleted_at: string | null
  cleared_at: string | null
  run: LogCommandRun | null
}

export interface LogNotification {
  kind: 'notification'
  id: string
  at: string
  user: LogUser | null
  /** `sub`, `resub`, `raid`, `follow`, `redemption`, `cheer`, `announcement`… */
  type: string
  /** Depends on `type`; every type has `system_message` and `text`. */
  payload: {
    system_message?: string
    text?: string
    reward?: { title?: string; cost?: number | null }
    bits?: number
    [k: string]: unknown
  }
  source: string
}

export interface LogModeration {
  kind: 'moderation'
  id: number
  at: string
  /** `ban`, `timeout`, `delete`, `clear`… */
  type: string
  message_id: string | null
  target: LogUser | null
  moderator: LogUser | null
  duration_s: number | null
  reason: string | null
  source: string
}

export type LogEntry = LogMessage | LogNotification | LogModeration

export interface LogSession {
  started_at: string
  ended_at: string | null
  end_reason: string | null
}

export interface LogGap {
  start: string
  end: string
  reason: 'before_log' | 'between_sessions' | 'not_listening'
  backfill: { complete: boolean; inserted: number | null; error: string | null; provider: string | null } | null
}

export interface LogCoverage {
  since: string
  until: string
  sessions: LogSession[]
  gaps: LogGap[]
  /** Whether the log has every message of the window Twitch let it see. */
  complete: boolean
}

export interface LogQuery {
  /** Inclusive, ISO 8601. */
  since?: string
  /** Exclusive, ISO 8601. */
  until?: string
  order?: 'asc' | 'desc'
  kind?: LogEntry['kind'][]
  /** A login, old ones too. */
  user?: string
  q?: string
  hide_removed?: boolean
  cursor?: string
  limit?: number
}

const nameOf = (u: LogUser | null | undefined) => u?.display_name || u?.login || u?.id || 'someone'
const text = (t: string): Token[] => (t ? [{ kind: 'text', text: t }] : [])

function removal(m: LogMessage): Removal | null {
  if (m.deleted_at) return { type: 'delete', reason: null, seconds: null }
  if (m.cleared_at) return { type: 'user_clear', reason: null, seconds: null }
  return null
}

const MODERATION: Record<string, string> = {
  ban: 'banned',
  unban: 'unbanned',
  timeout: 'timed out',
  untimeout: 'lifted the timeout on',
  delete: 'deleted a message from',
}

/** A v2 log entry as a chat line: messages as messages, notifications and moderation as notices. */
export function toChatLine(e: LogEntry, emotes?: EmoteSet | null, badges?: RawBadges | null): ChatLine {
  const base = { badges: [], action: false, bits: null, reward: null, removed: null }
  if (e.kind === 'message') {
    return {
      ...base,
      id: e.id,
      user: nameOf(e.user),
      login: e.user?.login ?? null,
      color: e.color,
      badges: resolveBadges(e.badges, badges),
      tokens: tokenize(e.fragments, emotes),
      kind: 'message',
      noticeType: null,
      action: e.message_type === 'action',
      bits: e.bits || null,
      // The log has the reward's id only; its title comes with the redemption notice.
      reward: e.reward_id ? { title: 'Reward', cost: null, input: null } : null,
      removed: removal(e),
    }
  }
  if (e.kind === 'notification') {
    const p = e.payload
    const said = p.text ? tokenize([{ text: p.text }], emotes) : []
    return {
      ...base,
      id: e.id,
      user: nameOf(e.user),
      login: e.user?.login ?? null,
      color: null,
      tokens: [...text(p.system_message || e.type), ...(said.length ? [...text(' — '), ...said] : [])],
      kind: 'notice',
      noticeType: e.type,
      bits: p.bits || null,
      reward: p.reward?.title ? { title: p.reward.title, cost: p.reward.cost ?? null, input: p.text || null } : null,
    }
  }
  const what = MODERATION[e.type] ?? e.type
  const span = e.duration_s ? ` for ${e.duration_s}s` : ''
  return {
    ...base,
    id: `mod-${e.id}`,
    user: nameOf(e.moderator),
    login: e.moderator?.login ?? null,
    color: null,
    tokens: text(`${nameOf(e.moderator)} ${what} ${nameOf(e.target)}${span}${e.reason ? `: ${e.reason}` : ''}`),
    kind: 'notice',
    noticeType: `moderation.${e.type}`,
  }
}
