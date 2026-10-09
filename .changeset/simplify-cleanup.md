---
"@vexoulz/platform-web": patch
---

Less idle work: an emote's image URLs are built once instead of for every chat line it appears in, and `usePoll`
stops waking up on a hidden tab (it still reloads as soon as the tab is visible again).
