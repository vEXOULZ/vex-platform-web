---
"@vexoulz/platform-web": minor
---

User cards in chat. `ChatLine` takes `user-cards` to make the name a button that emits `user` (line, anchor), and the
new `UserCard` opens on it: the chatter's picture, Twitch id (with copy), when the account was made, followers, roles,
a suspended mark, their bio, the badges they wore and a link to their channel, plus an `#actions` slot for the site's
own buttons. Profiles come from `loadTwitchUser({ id, login })` in `./chat` (ivr.fi's public API, one request per user
per page load), or from a site's own `createPlatformUi({ userLookup })`. `ChatLine.userId` is the chatter's id where
the source has it; `toChatLine` fills it from doomtp-bot's log.
