# @vexoulz/platform-web

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
