// The shapes vex-platform's v2 API serves (`/api/v2/jobs`, `/job-kinds`, `/audit`), as in its docs/conventions.md.
// Every app built on vex-platform (twitch-archive, doomtp-bot) serves the same ones. Times are ISO 8601 UTC.

/** A page of a list. Pass `next_cursor` back as `cursor` for the next one; null on the last page. */
export interface Page<T> {
  items: T[]
  next_cursor: string | null
}

export type JobState = 'queued' | 'running' | 'paused' | 'succeeded' | 'failed' | 'cancelled'
export const JOB_STATES: readonly JobState[] = ['queued', 'running', 'paused', 'succeeded', 'failed', 'cancelled']
export const ACTIVE_STATES: readonly JobState[] = ['queued', 'running', 'paused']
export const FINISHED_STATES: readonly JobState[] = ['succeeded', 'failed', 'cancelled']

/** Who did something: a signed-in user, an API key, the app itself (`system`) or a job. */
export interface Actor {
  kind: string
  id: string | null
  login: string | null
  /** How they came in: `session`, `api_key`, `job`… */
  via: string
}

export interface JobOut {
  id: number
  kind: string
  /** What the run is about, `type:id` (`vod:123`, `channel:456`), or null. */
  subject: string | null
  /** The channel the run belongs to, or null. */
  scope: string | null
  state: JobState
  /** The next step to run (the current one while running). */
  step: string | null
  steps: string[]
  payload: Record<string, unknown>
  attempts: number
  last_error: string | null
  /** Waiting out a retry backoff until then. */
  not_before: string | null
  /** Steps this run pauses before; null: its kind's. */
  pause_before: string[] | null
  /** Pause before the next step, once. */
  pause_next: boolean
  /** A cancel was asked for and the running step hasn't stopped yet (cooperative kinds). */
  cancel_requested: boolean
  actor: Actor
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
}

export type ProgressUnit = 'items' | 'parts' | 'bytes' | 'percent' | 'seconds' | (string & {})

export interface Progress {
  done: number
  total: number | null
  unit: ProgressUnit
}

export interface EventOut {
  id: number
  at: string
  level: 'debug' | 'info' | 'warning' | 'error' | (string & {})
  step: string | null
  message: string
  progress: Progress | null
}

export interface JobKindOut {
  name: string
  description: string
  steps: string[]
  /** Steps a run of this kind pauses before by default. */
  pause_before: string[]
  /** `interrupt`: a cancel stops a running step at once; `cooperative`: the step stops when it next checks. */
  cancel_mode: 'interrupt' | 'cooperative' | (string & {})
  max_attempts: number | null
}

export interface JobQuery {
  state?: JobState[]
  kind?: string
  subject?: string
  cursor?: string | null
  limit?: number
}

export interface EnqueueIn {
  kind: string
  subject?: string | null
  payload?: Record<string, unknown>
  /** Start at this step instead of the first. */
  step?: string | null
  pause_before?: string[] | null
  /** Queue it paused. */
  paused?: boolean
}

export interface JobUpdate {
  /** Steps to pause before; null goes back to the kind's. */
  pause_before?: string[] | null
  pause_next?: boolean
}

export type AuditOutcome = 'ok' | 'denied' | 'failed'

export interface AuditOut {
  id: number
  at: string
  /** `user`, `api_key`, `system`, `job` or `anonymous`. */
  actor_kind: string
  actor_id: string | null
  actor_login: string | null
  via: string
  /** Dotted: `vod.update`, `job.enqueue`, `request.denied`… */
  action: string
  /** `type:id`, or null. */
  target: string | null
  /** A channel id, or null. */
  scope: string | null
  /** The scope's name (a channel's login), when the app labels it (vex-platform ≥ 0.4). */
  scope_name?: string | null
  outcome: AuditOutcome | (string & {})
  before: unknown
  after: unknown
  detail: unknown
  request_id: string | null
  job_run_id: number | null
}

export interface AuditQuery {
  /** A prefix with a trailing dot (`vod.`), or an exact action. */
  action?: string
  /** A type with a trailing colon (`vod:`), or an exact target. */
  target?: string
  scope?: string
  actor_kind?: string
  actor_id?: string
  /** `me`, or a login (vex-platform ≥ 0.4). */
  actor?: string
  outcome?: AuditOutcome
  cursor?: string | null
  limit?: number
}
