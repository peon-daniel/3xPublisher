# Error Handling and Recovery

## Principles

- Never silently discard user content or replace a damaged project with an empty one.
- Explain the problem in plain language and provide a next action.
- Keep recoverable in-memory state when save/export fails.
- Avoid automatic retries for non-idempotent publishing calls with ambiguous outcomes.
- Distinguish validation warnings from blocking errors.

## Website cases

### JSON load/validation
- Invalid JSON: explain that the file could not be parsed; do not overwrite it.
- Unsupported schema version: do not silently downgrade or strip fields. Offer a backup/export path and report that the format is unsupported.
- Missing required fields or malformed groups: validate and explain which data needs repair. Repair only deterministic issues and report every repair.
- Duplicate or ambiguous image references: show the conflict and require resolution.

### Missing images
Apply the deterministic rules in `IMAGE_HANDLING.md`. Keep published history intact. Never modify the actual image files.

### Save/export
- Keep unsaved indicator visible on failure.
- Preserve in-memory edits.
- Tell the user whether a file was saved, downloaded, or still needs to be copied to the project folder.
- Do not imply browser local storage is a complete backup.

### User operations
- Confirm deletion of a populated group.
- Prevent dropping onto locked published groups or invalid occupied cross-group slots.
- If an operation is rejected, leave the previous state unchanged and explain why.

## Publisher cases (later)

- Invalid/missing JSON: stop before publishing.
- No unpublished groups: exit with a clear no-work message.
- Top-most unpublished group incomplete: stop; do not skip to a later group.
- Missing/unreadable image: stop before publishing and identify the affected group/post/image.
- Authentication/permission/API failure: report the actionable cause where available; do not mark published.
- Partial or ambiguous publication: leave group unpublished, warn that some posts may already exist, and require the user to inspect Instagram before retrying.
- JSON update failure after successful publication: report that Instagram may contain published content while local state was not updated; preserve a recoverable copy and explain how to reconcile manually.
