# Development Plan

## Rule

Implement one phase at a time. The static website and stable JSON data contract come first. Do not begin the publisher or scheduling work prematurely. Each phase must pass its tests and acceptance criteria before the next phase begins.

## Phase 0 — Repository audit and technical baseline

**Objectives**
- Inspect existing files, repository settings, and GitHub Pages setup.
- Confirm the simplest suitable frontend/build approach.
- Review the proposed v1 JSON contract and list any essential decisions needing approval.

**Read**
- `README.md`, `.github/copilot-instructions.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`, `DECISIONS.md`.

**Expected output**
- Repository inventory and implementation checklist.
- Proposed stack and deployment approach documented.
- Approved schema decisions recorded before publisher work.

**Acceptance/tests**
- No application code changes without approval of the Phase 0 plan.
- Existing files and user work are preserved.
- Unresolved essentials are listed explicitly.

**Concrete checklist for sign-off (Phase 0 only)**
- Confirm baseline stack: TypeScript + Vite + Vitest.
- Confirm Pages deploy method: GitHub Actions static artifact deployment.
- Confirm browser baseline and fallback semantics for file access.
- Confirm schema baseline decisions recorded in `DATA_SCHEMA.md`.
- Confirm duplicate filename ambiguity handling (no silent auto-resolution).
- Confirm numbered export pattern (`instagram-plan-001.json` onward).
- Confirm no application code is added before this checklist is approved.

## Phase 1 — Project skeleton and test harness

**Objectives**
- Establish minimal static site structure, styling conventions, and test setup.
- Configure local development and GitHub Pages-compatible build/deploy if needed.

**Expected components**
- App entry point and static assets.
- Unit-testable model/utility layer.
- Test and build scripts documented.

**Dependencies**
- Phase 0 decisions.

**Acceptance/tests**
- App starts locally.
- Build/deploy artifact is static and compatible with GitHub Pages.
- Automated tests run in a clean checkout.
- No backend or secret configuration is required.

## Phase 2 — JSON schema, validation, and project I/O

**Objectives**
- Implement the agreed schema, import, validation, serialization, and export fallback before complex UI operations.

**Relevant docs**
- `DATA_SCHEMA.md`, `FILE_STORAGE_AND_EXPORT.md`, `ERROR_HANDLING.md`, `SECURITY_AND_PRIVACY.md`.
- `PHASE2_PLAN.md` for concrete module boundaries and implementation order.

**Expected components**
- Schema/model definitions.
- Import/validation and safe serialization.
- File/folder selection capability detection.
- Dirty-state tracking and export/download workflow.

**Acceptance/tests**
- Valid project round-trips without losing supported data.
- Invalid/unsupported JSON is not silently overwritten.
- Empty/new project works.
- Save failures retain state and show a dirty warning.
- No source image file is modified.

## Phase 3 — Image catalog and reconciliation

**Objectives**
- Discover accessible images, match JSON references, add new images, and reconcile missing files.

**Relevant docs**
- `IMAGE_HANDLING.md`, `DATA_SCHEMA.md`, `ERROR_HANDLING.md`.

**Acceptance/tests**
- New images become unassigned.
- All missing-image cases follow the documented rules.
- Published history is preserved.
- Ambiguous filenames are reported, not silently conflated.

## Phase 4 — Core layout and assignment

**Objectives**
- Build two-pane workspace, post groups, bottom placeholder, drag/drop assignment, carousel ordering, removal, insertion, and deletion.

**Relevant docs**
- `WEBSITE_SPEC.md`, `UI_UX_SPEC.md`, `IMAGE_HANDLING.md`.

**Acceptance/tests**
- Every committed group has exactly three post slots.
- Placeholder is not serialized.
- Removing an image returns it to unassigned.
- Group/post drag constraints are enforced.
- Published groups cannot be edited or moved.
- Populated group deletion requires confirmation and returns images.

## Phase 5 — Descriptions, dictionary, hashtags, and preview

**Objectives**
- Implement dictionary editing, initial hashtag generation, saved caption editing, limits/warnings, descriptions, and temporary grid preview.

**Relevant docs**
- `WEBSITE_SPEC.md`, `UI_UX_SPEC.md`, `IMAGE_HANDLING.md`, `DATA_SCHEMA.md`.

**Acceptance/tests**
- Filename parsing follows documented deterministic rules.
- First-image-only hashtag generation; duplicate removal works.
- Dictionary edits do not rewrite existing saved hashtags.
- Default limit is four; overrides persist; over-limit captions are warned, not truncated.
- Preview cancel restores display and leaves serialized model unchanged.
- Descriptions and hashtags remain optional.

## Phase 6 — Save-state polish, accessibility, and end-to-end verification

**Objectives**
- Verify dirty/saved/exported states, recovery messages, keyboard controls, responsive layout, and complete user flows.

**Relevant docs**
- `FILE_STORAGE_AND_EXPORT.md`, `ERROR_HANDLING.md`, `SECURITY_AND_PRIVACY.md`, `TESTING.md`.

**Acceptance/tests**
- User can create, save/export, close, reopen, and continue a project.
- Save/export status is truthful.
- Keyboard actions do not interfere with text entry.
- No unintended network upload occurs.
- All Phase 1–6 tests pass.

## Phase 7 — Release and GitHub Pages deployment

**Objectives**
- Document deployment and publish the website.
- Verify clean public load and supported-browser behavior.

**Acceptance/tests**
- Site loads from GitHub Pages.
- No secrets or private project data are deployed.
- README explains limitations and how to export/restore projects.
- All blocking tests pass.

## Phase 8 — Publisher feasibility research and contract freeze

**Objectives**
- Research current official Instagram API requirements, media transfer, permissions, credentials, and publishing semantics.
- Freeze/approve JSON contract before publisher implementation.

**Relevant docs**
- `PUBLISHER_SPEC.md`, `INSTAGRAM_INTEGRATION.md`, `DATA_SCHEMA.md`, `SECURITY_AND_PRIVACY.md`.

**Acceptance/tests**
- Research is based on current official sources.
- Media access, account eligibility, credential handling, and success detection have documented solutions.
- Any architecture change is approved before coding.

## Phase 9 — Local publisher (later, separately scoped)

**Objectives**
- Implement a local program that publishes one top-most eligible group per run.

**Acceptance/tests**
- Incomplete top group blocks publication of later groups.
- Description/hashtags are optional.
- No published status on failure/ambiguous outcome.
- Safe JSON update and partial-failure warning work.
- Controlled test confirms the publication order required for the intended grid.

## Future scheduling

Scheduling is optional and not part of the initial schema or phases. Revisit only after core website and publisher behavior are stable and official API support is verified.
