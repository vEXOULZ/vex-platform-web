---
"@vexoulz/platform-web": minor
---

The `--vxp-*` defaults in `style.css` (and their dark-scheme values) are declared under `:where(:root)`, specificity zero, so a site's plain `:root` override wins whatever order the stylesheets load in. Sites can drop their `:root:root { … }` workaround. No API change; only a site that relied on the library's CSS loading first to beat its own `:root` rule sees a difference.
