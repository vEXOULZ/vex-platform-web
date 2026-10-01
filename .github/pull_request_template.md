## What changed

## Checklist
- [ ] The branch is named per [Conventional Branch](../CONTRIBUTING.md#branches) (`feature/`, `bugfix/`, `hotfix/`, `release/`, `chore/`).
- [ ] Shapes match vex-platform's v2 API (its `docs/conventions.md`); new ones have a test against recorded JSON in `tests/fixtures/`.
- [ ] Components use only the `--vxp-*` variables and native elements: nothing from vexoulz-ui or a router, so other instances can use them.
- [ ] Nothing vexoulz-specific: links, names and toasts come from the site through `createPlatformUi`.
- [ ] A changeset was added if `src/` changed (`npm run changeset`).
- [ ] **No private infrastructure**: no hostnames of machines, IPs, server paths, proxy/tunnel config or deploy scripts. Those belong in the private homelab docs, not here.
