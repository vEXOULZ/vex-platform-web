---
"@vexoulz/platform-web": minor
---

`bytes()` moves to its own module and settles on one format: binary units (B, KB, MB, GB, TB), one decimal under 10 with a trailing ".0" dropped ("4 GB", not "4.0 GB"), whole numbers from 10, a rounded-up 1024 carried to the next unit, the sign kept, "—" for null.
