# baozi.space Asset Interface v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete B-lite image package whose filenames, visible poses, frame order, anchors, and runtime roles are unambiguous.

**Architecture:** Canonical transparent PNG frames are the source of truth. A tested Python pipeline compiles WebP Sprite sheets, manifest data, contact sheets, checksums, and a zip; runtime code consumes only manifest-declared paths and frame IDs.

**Tech Stack:** Python 3, Pillow, SciPy, JSON, WebP, ZIP.

**Spec:** `docs/superpowers/specs/2026-09-08-asset-interface-v2-design.md`

## Global Constraints

- Preserve the approved B-lite character identity and visual treatment.
- Keep intro and home-orbit assets in separate trees.
- Every canonical frame must be a genuine RGBA PNG with transparent corners.
- `person-stumble-fall-exit-right` contains exactly 10 semantic frames in the approved order.
- Runtime images and manifests are generated artifacts, never hand-edited.
- Intro runtime image payload must remain below 6 MiB.

---

### Task 1: Asset-pipeline contract tests

**Files:**
- Create: `tests/test_asset_pipeline.py`
- Create: `tools/asset_pipeline.py`

**Interfaces:**
- Produces: `extract_frame`, `normalize_cutout`, `assemble_sheet`, `validate_manifest`.

- [ ] Write tests using hand-derived dimensions and intentionally malformed manifests.
- [ ] Run `python -m unittest tests/test_asset_pipeline.py -v`; verify failure because `tools.asset_pipeline` does not exist.
- [ ] Implement the four minimal helpers.
- [ ] Re-run the test and verify all cases pass.

### Task 2: Canonical semantic frames

**Files:**
- Create: `assets/intro/frames/**.png`
- Create: `assets/home/frames/**.png`
- Create: `spec/sequence-catalog.json`

**Interfaces:**
- Consumes: approved B-lite source sheets and two regenerated poses.
- Produces: one correctly named RGBA PNG per frame plus an ordered catalog.

- [ ] Extract every reusable v1 cell without changing its pixels.
- [ ] Remove baked checkerboard only from the two regenerated poses and preserve the warm paper border.
- [ ] Normalize the two new poses into 384×384 cells.
- [ ] Insert them as `stumble-catch-step` and `fall-impact` in the ten-frame fall sequence.
- [ ] Record descriptions and anchors for every frame in `sequence-catalog.json`.

### Task 3: Runtime compilation and v2 manifest

**Files:**
- Create: `tools/build_runtime.py`
- Create: `manifest/asset-manifest.v2.json`
- Create: `assets/intro/runtime/*.webp`
- Create: `assets/home/runtime/*.webp`

**Interfaces:**
- Consumes: `spec/sequence-catalog.json` and canonical frames.
- Produces: deterministic Sprite sheets and manifest entries with `frameIds` and `frames`.

- [ ] Add a failing integration test that assembles a miniature sequence and asserts exact cell placement.
- [ ] Run the test and verify the expected failure.
- [ ] Implement the build entry point and compile all eight runtime assets.
- [ ] Generate the v1-to-v2 alias map and verify every alias resolves.
- [ ] Re-run all tests.

### Task 4: Human-readable handoff and QA

**Files:**
- Create: `README.md`
- Create: `docs/frame-catalog.md`
- Create: `docs/integration.md`
- Create: `docs/migration-v1-to-v2.md`
- Create: `qa/contact-sheets/*.png`

**Interfaces:**
- Consumes: compiled manifest and canonical frames.
- Produces: a harness-ready replacement guide and labeled visual evidence.

- [ ] Generate one labeled contact sheet per sequence.
- [ ] Document old path → new ID → new path mappings.
- [ ] Document the 10-frame fall order and the single required runtime change from 8 to 10 frames.
- [ ] Document home perspective values `0.86 / 0.97 / 1.08` without baking them into images.

### Task 5: Package verification and delivery

**Files:**
- Create: `tools/verify_package.py`
- Create: `qa/verification-report.json`
- Create: `checksums.sha256`
- Create: `baozi-space-assets-v2.0.zip`

**Interfaces:**
- Produces: a self-verifying distribution archive.

- [ ] Verify all source PNGs are RGBA, have transparent corners, and match catalog dimensions.
- [ ] Verify every runtime Sheet dimension, frame count, Manifest reference, and checksum.
- [ ] Verify intro runtime payload is below 6 MiB.
- [ ] Build the zip and run `unzip -t` against it.
- [ ] Save the final zip as the persistent user-facing deliverable.
