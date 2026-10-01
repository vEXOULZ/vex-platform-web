---
"@vexoulz/platform-web": minor
---

Related jobs (vex-platform 0.6): `JobOut.parent_id`, `client.related(id)` (`GET /jobs/{id}/related`), a `parent` filter
on `jobs()`, and `jobTree()` to lay a tree out as rows. `JobDetail` shows a "Queued by" link and, under the log, the
new `RelatedJobs`: the run's tree as an indented list and other runs on the same subject (turn off with
`:related="false"`). Older servers just show no tree.
