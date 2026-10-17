---
'@vex/platform-web': minor
---

The package is now `@vex/platform-web`, installed from `github:vexouLuna/vex-platform-web`. Sites change their
imports from `@vexoulz/platform-web` to `@vex/platform-web` (and `/chat`, `/vue`) when they bump to this release.
The `createPlatformUi` injection key is now `Symbol('vex-platform-ui')`; nothing outside the package reads it.
