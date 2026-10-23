# Decisions, Proposals, and Open Questions

This document distinguishes decisions supported by the planning conversation from implementation details that still need validation. If a new requirement conflicts with a confirmed decision, stop and ask rather than silently changing behavior.

## Confirmed product decisions

- Project is open source and intended for public use through a GitHub Pages static website.
- Website is the first implementation priority; local publisher comes later.
- Website and publisher are independent and communicate through a JSON project file.
- Source image files must never be modified.
- Project JSON is the portable source of truth; browser storage is only a recovery aid.
- Canonical proposed filename is `instagram-plan.json`; numbered JSON exports are needed.
- Browser folder enumeration/write access cannot be assumed. Provide truthful save status and export fallback.
- Each committed 3x group has exactly three posts; each post can contain a carousel.
- One empty placeholder group always appears at the bottom in the UI but is not committed to JSON.
- Published groups form a gray, locked block at the top; unpublished groups cannot move above them.
- Successful new publications move to the top of the published block.
- Preview temporarily places the next ready group at the top of the published block and must not mutate permanent order or JSON.
- Group drag moves the whole group. Post reordering is within a group; cross-group movement is allowed only into an empty slot.
- Images removed from a post return to Unassigned Photos. Hidden means hidden from the list, not deleted.
- Unassigned images are alphabetically ordered by default; custom ordering persists.
- New post description defaults to literal `.`; description and hashtags are optional for publishing readiness.
- Readiness requires all three post slots to contain at least one image. Publisher does not skip an incomplete top unpublished group.
- Dictionary identifiers map to one or more hashtags; duplicate generated hashtags are removed.
- Hashtags are initially derived from the first image only. Dictionary edits and lead-image changes do not regenerate saved hashtags.
- Default hashtag limit is four, configurable, with per-post override and warning rather than truncation.
- Unassigned images can have saved descriptions; bulk description assignment does not create posts.
- Publisher attempts one group per run, has no `failed` status, and leaves unsuccessful/ambiguous groups unpublished.
- Partial publication may require the user to inspect Instagram before retrying.
- Scheduling is optional future work, not part of the initial schema.
- The website does not publish to Instagram.

## Implementation proposals in this handover

These are concrete proposals to make implementation possible, not claims that the exact technical details were previously agreed:

- The field names and nesting in `DATA_SCHEMA.md` form a proposed v1 JSON contract.
- Keep the frontend stack as simple as possible and compatible with static GitHub Pages; inspect the repository before choosing a framework.
- Store image references by filename, with a clear conflict-resolution path for duplicate filenames.
- Treat filename parsing as a pure function with deterministic documented rules.
- Use a UI-only placeholder group and exclude it from JSON.
- Use explicit dirty-state tracking and safe export/write behavior.

## Phase 0 baseline decisions (approved)

Date: 2026-10-23

1. Frontend baseline for initial implementation
- Use TypeScript with standard browser APIs and a small static build toolchain.
- Use Vite for local dev/build and Vitest for unit tests of business logic.
- Keep architecture framework-agnostic in early phases. Do not introduce a UI framework unless Phase 1/2 complexity proves it necessary.

2. GitHub Pages deployment method
- Use GitHub Pages with GitHub Actions deployment (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) when application code begins.
- Keep deploy output fully static. Do not add server runtime dependencies.

3. Browser support baseline for Phase 1/2
- Primary target: current Chromium-based browsers.
- Secondary target: current Firefox and Safari with graceful fallback to export/download workflows where direct file system write APIs are unavailable.
- Never imply direct folder save/write support where the browser does not provide it.

4. JSON contract baseline and publication status semantics
- Keep `publicationStatus` as a stored field with allowed values `ready`, `published`, `not ready`.
- Normalize and validate `publicationStatus` on load.
- Recompute and persist `publicationStatus` after model mutations that affect readiness.
- Publisher must validate real image presence and group eligibility before publish attempts; stored status is advisory metadata, not a bypass.

5. Duplicate filename strategy
- v1 does not silently resolve ambiguous duplicate filenames across subfolders.
- If duplicates are detected in accessible sources, block automatic reconciliation for those references and require explicit user resolution.
- Do not auto-pick by path depth, lexical order, or discovery order.

6. Numbered export strategy
- Canonical filename remains `instagram-plan.json`.
- Numbered exports use zero-padded three digits: `instagram-plan-001.json`, `instagram-plan-002.json`, and so on.
- If multiple candidate JSON files are present and the newest cannot be determined unambiguously from accessible metadata, require explicit user selection.

## Unresolved decisions to settle during implementation

1. **Exact JSON contract:** review the proposed fields in `DATA_SCHEMA.md` during Phase 0, before publisher work.
2. **Filename parsing details:** define separators, whitespace/case rules, and how to identify the image ID without treating it as a hashtag.
3. **Publisher feasibility:** verify current official API eligibility, permissions, media transfer, token storage, success detection, and publication order before coding.
4. **Description templates:** reusable templates were discussed as a possible convenience, but exact template behavior is not settled. Treat as optional and do not let it block core descriptions/captions.
5. **Exact save-state semantics:** distinguish saved-to-source-file from downloaded-export state; decide whether export clears dirty state or indicates “downloaded, needs copying” separately.

## Explicitly not approved

- Adding scheduling fields or a scheduled state to JSON.
- Storing Instagram tokens in project JSON.
- Uploading local images to an unapproved server/service.
- Automatically rewriting existing hashtags/descriptions when dictionary rules change.
- Marking partial/ambiguous publication as published.
- Implementing the whole website and publisher in one pass.
