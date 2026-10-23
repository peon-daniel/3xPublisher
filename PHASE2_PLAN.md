# Phase 2 Implementation Plan (Schema, Validation, and Project I/O)

## Scope guard

This phase implements data contract handling and persistence workflows only.

Included:
- JSON schema model and normalization
- Import validation and safe load behavior
- Serialization and export/save semantics
- Dirty-state semantics based on real persistence outcomes
- Unit tests for schema and I/O rules

Not included:
- Image catalog reconciliation logic (Phase 3)
- Drag/drop or group layout behavior (Phase 4)
- Dictionary UI and hashtag generation behavior (Phase 5)
- Publisher implementation

## Proposed module boundaries

All modules below are pure logic unless marked as browser adapter code.

### Core data model

- `src/core/project/types.ts`
  - Canonical TypeScript types for schema v1.
  - Narrow string unions for `publicationStatus`.

- `src/core/project/defaults.ts`
  - Factory helpers for deterministic defaults.
  - New-project seed state.

### Schema validation and normalization

- `src/core/schema/validateProject.ts`
  - Validate parsed JSON shape and required fields.
  - Return structured errors and warnings (no thrown UI strings).

- `src/core/schema/normalizeProject.ts`
  - Normalize tolerated variants to canonical internal model.
  - Enforce group has exactly three posts.
  - Normalize `publicationStatus` to `ready | published | not ready`.

- `src/core/schema/versioning.ts`
  - `schemaVersion` checks and unsupported-version handling.
  - Read-only recommendation flags for unsupported versions.

### Import/export and persistence

- `src/core/io/parseProjectJson.ts`
  - Parse UTF-8 JSON text to `unknown` with parse diagnostics.

- `src/core/io/importProject.ts`
  - Orchestrate parse -> validate -> normalize.
  - Return import result with errors/warnings and safe state outcome.

- `src/core/io/serializeProject.ts`
  - Convert canonical project state to stable JSON string.
  - Exclude UI-only placeholder group.

- `src/core/io/fileNaming.ts`
  - Canonical file naming helpers:
    - `instagram-plan.json`
    - `instagram-plan-001.json` and increment rules.

- `src/core/io/persistState.ts`
  - Persistence status model:
    - unsaved
    - saved-to-selected-file
    - exported-download-needs-copy
    - save-failed
  - Dirty-flag transitions only after confirmed success.

### Browser adapters (thin wrappers)

- `src/adapters/fileAccess/capabilities.ts`
  - Detect available file APIs.

- `src/adapters/fileAccess/readers.ts`
  - Read selected file/folder entries into core I/O APIs.

- `src/adapters/fileAccess/writers.ts`
  - Execute writes/exports and report actual success/failure.

These adapter modules should not contain schema business rules.

## Test plan for Phase 2

### Validation and schema tests

- Accept valid v1 structure and preserve supported fields.
- Reject unsupported `schemaVersion` with non-destructive result.
- Enforce three posts per committed group.
- Reject unknown `publicationStatus` values.
- Ensure credentials/scheduling fields are not introduced by serializers.

### Import flow tests

- Invalid JSON parse error does not overwrite existing state.
- Missing required fields produce actionable diagnostics.
- Deterministic normalization is idempotent.

### Export and persistence tests

- Serializer excludes UI placeholder group.
- Save success clears dirty state.
- Save failure keeps dirty state and in-memory edits.
- Export fallback marks state as exported-needs-copy.
- Numbered filename increment is deterministic.

## Implementation sequence checklist

1. Define canonical project v1 types and default builders.
2. Implement parse/validate/normalize pipeline with typed diagnostics.
3. Implement serializer with stable field ordering strategy.
4. Implement filename strategy helpers for canonical and numbered exports.
5. Implement persistence status state machine and dirty-state transitions.
6. Add unit tests for all rules listed above.
7. Wire minimal adapter stubs to prove browser capability branching.
8. Run `npm test` and `npm run build` before moving to Phase 3.

## Approval notes

- This plan intentionally avoids choosing a runtime validation library in advance.
- If a validation library is introduced (for example Zod), approve it first and document why it improves maintainability without violating the minimal-dependency principle.
