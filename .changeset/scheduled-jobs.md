---
"@vexoulz/platform-web": minor
---

A queued run whose start is still ahead (a retry backoff, or a step that put itself off to a set time such as a
YouTube daily limit) reads "scheduled" in its state chip, with when it starts and its last error in the jobs table.
New `scheduledFor(job)`; the detail's "Next try" is now "Starts".
