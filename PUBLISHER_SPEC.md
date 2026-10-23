# Local Publisher Specification — Later Phase

## Status

This component is deliberately secondary. Do not implement it during the initial website phases. Begin only after the JSON contract in `DATA_SCHEMA.md` has been reviewed, implemented, and covered by tests.

## Intended operation

- A local program is placed in the same project folder as the images and JSON.
- User double-clicks/runs it.
- It reads and validates the JSON.
- It identifies the top-most unpublished group.
- It validates that all three post slots contain at least one resolvable image.
- It attempts to publish exactly that group, then exits.
- After verified success, it updates JSON to mark the group `published`, records a timestamp if supported, and moves the group to the top of the published block.
- A subsequent run processes the next eligible group.

## Readiness

A group is ready only when all three posts have at least one image. Descriptions and hashtags are optional. The literal `.` placeholder is allowed. The publisher must not skip an incomplete top-most unpublished group to publish a later group.

The empty bottom UI placeholder is never in JSON and must never be published.

## Ordering

The intended grid likely requires publishing the third, second, then first post within a group (right-to-left). Verify this behavior in a controlled account/test before relying on it. Do not claim this sequence is confirmed until tested.

## Success and failure

- Mark a group published only after the API workflow provides a reliable success condition for all three posts.
- If a publication attempt fails or its result is ambiguous, do not mark the group published.
- There is no `failed` status. Use `ready` or `not ready` according to the agreed schema/readiness rules and present actionable error information.
- Partial publishing can leave one or two posts live while the group remains unpublished in JSON. The user has accepted responsibility to inspect Instagram before retrying in this case. Clearly warn against blind retries after partial/ambiguous outcomes.
- Avoid retrying a non-idempotent publish operation automatically when the previous outcome is uncertain.

## File updates

- Validate the file before publishing.
- Do not overwrite the JSON in a way that risks truncation/corruption. Use a safe write/backup strategy appropriate to the target OS.
- Preserve descriptions and saved hashtags exactly; do not regenerate them from filenames.
- Never modify source image files.
- Credentials/tokens must be stored outside the project JSON and protected according to `SECURITY_AND_PRIVACY.md`.

## Dependencies and blockers

Before implementation, research and document:
- account eligibility and required Instagram account type,
- current official API support and permissions,
- media hosting/transfer requirements for local images,
- token acquisition, renewal, revocation, and secure storage,
- API ordering and carousel/publishing limits,
- error semantics and how to detect a genuinely completed three-post group.

Do not invent support for direct local-file upload or future scheduling. Scheduling is out of scope unless explicitly prioritized later.
