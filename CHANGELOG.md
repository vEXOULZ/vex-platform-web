# @vex/platform-web

## 0.9.0

### Minor Changes

- 44f3632: The package is now `@vex/platform-web`, installed from `github:vexouLuna/vex-platform-web`. Sites change their
  imports from `@vexoulz/platform-web` to `@vex/platform-web` (and `/chat`, `/vue`) when they bump to this release.
  The `createPlatformUi` injection key is now `Symbol('vex-platform-ui')`; nothing outside the package reads it.

## 0.8.0

### Minor Changes

- e12e483: User cards in chat. `ChatLine` takes `user-cards` to make the name a button that emits `user` (line, anchor), and the
  new `UserCard` opens on it, kept compact: the chatter's picture, name and login, Partner / Affiliate / Staff, when the
  account was made, their Twitch id (with copy), a two-line bio, the badges they wore and a link to their channel, plus
  an `#actions` slot for the site's own buttons. Profiles come from the site's `createPlatformUi({ userLookup })`:
  `twitchUserLookup(url)` reads doomtp-bot's `GET /api/v2/twitch/users?id=|login=` (the id when the line has one), one
  request per user per page load. Without a lookup the card shows what the chat line knows. `ChatLine.userId` is the
  chatter's id where the source has it; `toChatLine` fills it from doomtp-bot's log.

## 0.7.0

### Minor Changes

- 321fe3e: A queued run whose start is still ahead (a retry backoff, or a step that put itself off to a set time such as a
  YouTube daily limit) reads "scheduled" in its state chip, with when it starts and its last error in the jobs table.
  New `scheduledFor(job)`; the detail's "Next try" is now "Starts".

## 0.6.0

### Minor Changes

- d562a86: Tick several jobs in `JobsBrowser` to resume, pause, retry or cancel them together (a confirm for cancel); each button counts the ticked runs it applies to. `JobsTable` takes `selectable` and a `v-model:selected` of ids, `useJobBatch` sends one action to many runs and reports once, and `batchTargets` says which runs an action applies to. `JobsBrowser` is selectable unless `:selectable="false"`.

## 0.5.0

### Minor Changes

- aa36287: The `--vxp-*` defaults in `style.css` (and their dark-scheme values) are declared under `:where(:root)`, specificity zero, so a site's plain `:root` override wins whatever order the stylesheets load in. Sites can drop their `:root:root { … }` workaround. No API change; only a site that relied on the library's CSS loading first to beat its own `:root` rule sees a difference.

## 0.4.0

### Minor Changes

- 0163937: `bytes()` moves to its own module and settles on one format: binary units (B, KB, MB, GB, TB), one decimal under 10 with a trailing ".0" dropped ("4 GB", not "4.0 GB"), whole numbers from 10, a rounded-up 1024 carried to the next unit, the sign kept, "—" for null.
- 34d5098: `ProblemError` keeps the body fields it doesn't read in `extra`, reads Retry-After as an HTTP date too (`parseRetryAfter`), reads `{error}` and FastAPI `{detail: [{msg}]}` bodies, falls back to the status text, and adds `retryAfterText()` for login pages.

## 0.3.1

### Patch Changes

- 9636552: Less idle work: an emote's image URLs are built once instead of for every chat line it appears in, and `usePoll`
  stops waking up on a hidden tab (it still reloads as soon as the tab is visible again).

## 0.3.0

### Minor Changes

- 11c0120: Related jobs (vex-platform 0.6): `JobOut.parent_id`, `client.related(id)` (`GET /jobs/{id}/related`), a `parent` filter
  on `jobs()`, and `jobTree()` to lay a tree out as rows. `JobDetail` shows a "Queued by" link and, under the log, the
  new `RelatedJobs`: the run's tree as an indented list and other runs on the same subject (turn off with
  `:related="false"`). Older servers just show no tree.

## 0.2.1

### Patch Changes

- d2e70f0: `LogGap.backfill.job_id`: the job run that filled a coverage gap, as doomtp-bot now reports it.

## 0.2.0

### Minor Changes

- 098c00e: `PlatformClient.jobCounts(q)` for vex-platform 0.5's `GET /jobs/counts` (runs per state, `kind`, `subject`, `since`), and `loadBadges(url)` in `./chat`, which reads a backend's `{channel, global}` Twitch badges for `toChatLine`.

## 0.1.1

### Patch Changes

- 94efc1e: Fixes from wiring the components into vods.vexoulz.net:
  
  - Native Twitch emotes from a chat replay load again: a replay fragment's `emote.id` carries the emote's offsets (`<id>;<start>;<end>`), so `emote.emoteID` is read first and the offsets are dropped.
  - The state tabs no longer show a scrollbar.
  - `AuditBrowser` takes `hideScope`, for an app without scopes.

## 0.1.0

### Minor Changes

- 83397f0: First release: the v2 jobs and audit client, chat-line parsing (moved from vods-core) with `toChatLine` and
  `loadChannelEmotes`, and the Vue jobs, audit and chat-line components.
