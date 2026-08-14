# baozi.space A0-V production asset delivery

This package is ready for the local harness A0-V acceptance flow.

## Install into the handoff project

From the package root, copy the contents of `design-assets/intro/` into the same path in the local project. Do not copy the source PNGs or QA previews into `public/`.

The production files are already arranged under:

```text
design-assets/intro/incoming-production/
```

The completed manual review record and six labeled contact sheets are under:

```text
design-assets/intro/qa/
```

Then continue with Task 6 / A0-V in `docs/superpowers/plans/2026-08-13-intro-dual-track-implementation.md`:

1. Run the harness incoming-production audit.
2. Confirm `design-assets/intro/qa/visual-qa.json` contains six `true` values.
3. Run the guarded production publication step.
4. Run unit tests and the desktop Playwright checks.

## Verified delivery properties

- Six 8-frame, 4×2 lossless WebP sprite sheets.
- Exact sheet sizes defined by the production contract.
- Real alpha with transparent corners and isolated frame silhouettes.
- Right-facing watercolor cut-paper characters with warm-white outlines.
- One 768×768 transparent fallback still.
- Production manifest at 9 fps with eight normalized anchors per action.
- Total runtime image payload: 2,632,052 bytes (below the 6 MiB limit).

The harness remains responsible for repository publication, timeline integration, responsive verification, reduced-motion behavior, failure fallbacks, and final browser acceptance.
