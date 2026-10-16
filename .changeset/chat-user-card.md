---
"@vexoulz/platform-web": minor
---

User cards in chat. `ChatLine` takes `user-cards` to make the name a button that emits `user` (line, anchor), and the
new `UserCard` opens on it, kept compact: the chatter's picture, name and login, Partner / Affiliate / Staff, when the
account was made, their Twitch id (with copy), a two-line bio, the badges they wore and a link to their channel, plus
an `#actions` slot for the site's own buttons. Profiles come from the site's `createPlatformUi({ userLookup })`:
`twitchUserLookup(url)` reads doomtp-bot's `GET /api/v2/twitch/users?id=|login=` (the id when the line has one), one
request per user per page load. Without a lookup the card shows what the chat line knows. `ChatLine.userId` is the
chatter's id where the source has it; `toChatLine` fills it from doomtp-bot's log.
