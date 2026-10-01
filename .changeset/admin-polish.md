---
"@vexoulz/platform-web": patch
---

Fixes from wiring the components into vods.vexoulz.net:

- Native Twitch emotes from a chat replay load again: a replay fragment's `emote.id` carries the emote's offsets (`<id>;<start>;<end>`), so `emote.emoteID` is read first and the offsets are dropped.
- The state tabs no longer show a scrollbar.
- `AuditBrowser` takes `hideScope`, for an app without scopes.
