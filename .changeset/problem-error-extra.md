---
"@vexoulz/platform-web": minor
---

`ProblemError` keeps the body fields it doesn't read in `extra`, reads Retry-After as an HTTP date too (`parseRetryAfter`), reads `{error}` and FastAPI `{detail: [{msg}]}` bodies, falls back to the status text, and adds `retryAfterText()` for login pages.
