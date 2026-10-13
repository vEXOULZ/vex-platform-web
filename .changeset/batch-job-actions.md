---
"@vexoulz/platform-web": minor
---

Tick several jobs in `JobsBrowser` to resume, pause, retry or cancel them together (a confirm for cancel); each button counts the ticked runs it applies to. `JobsTable` takes `selectable` and a `v-model:selected` of ids, `useJobBatch` sends one action to many runs and reports once, and `batchTargets` says which runs an action applies to. `JobsBrowser` is selectable unless `:selectable="false"`.
