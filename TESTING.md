# Testing Strategy and Acceptance Criteria

## General requirements

- Test business logic independently from UI rendering.
- Use synthetic filenames, project JSON, and generated test images; never commit private user data.
- Include regression tests for every resolved edge case.
- Run tests after each phase and report actual results; do not claim tests passed unless they were run.

## Unit tests

### Schema and serialization
- Valid schema loads and serializes without loss of supported fields.
- Invalid JSON and unsupported schema versions are handled safely.
- Each committed group has exactly three posts.
- Placeholder is excluded from serialized groups.
- Publication status uses only `ready`, `published`, or `not ready`.
- No credentials or scheduling fields are introduced.

### Filename/dictionary
- `P123456` is not treated as a hashtag.
- Identifiers in different orders are parsed.
- One identifier can map to multiple hashtags.
- Duplicate hashtags are removed.
- Different identifiers mapping to the same hashtag do not produce duplicates.
- Dictionary edits do not alter saved hashtags in existing posts.
- First-image change does not regenerate hashtags automatically.

### Image reconciliation
Test each rule in `IMAGE_HANDLING.md`: missing carousel item, missing lead image, last image in unpublished post, last image in published post, newly discovered image, hidden state, ambiguous duplicate filenames, and custom unassigned order.

### Layout operations
- Group reorder cannot cross above published block.
- Published groups are locked.
- Post reorder stays within its group.
- Cross-group post movement only targets an empty slot.
- Image assignment/removal maintains one-post ownership.
- Group deletion returns images and requires confirmation when populated.
- Preview is a non-mutating projection and cancel restores original display.

### Captions and hashtag limit
- Caption uses description or `.` followed by a blank line and hashtags.
- Empty descriptions and hashtags are allowed.
- Default limit is four unique hashtags.
- Per-post override persists when global default changes.
- Over-limit warning appears; content is not silently truncated.

### Save/export
- Dirty state appears after edits.
- Successful save/export clears dirty state according to the actual persistence semantics.
- Failed save keeps dirty state and in-memory changes.
- Multiple numbered JSON files do not cause an ambiguous file to be selected silently.
- Source image files remain unchanged.

## Integration / end-to-end tests

1. Start a new project from a folder of images.
2. Assign images to three posts and create a carousel.
3. Edit descriptions and hashtags; test dictionary preview.
4. Reorder groups/posts under the documented constraints.
5. Hide and unhide unassigned images.
6. Export JSON, reopen it, and confirm state persists.
7. Remove/rename test files and verify reconciliation behavior.
8. Preview a ready group, cancel, and compare the model/JSON before and after.
9. Verify the app operates without uploading images or project JSON.

## Browser testing

Test at least one current Chromium-based browser and one additional supported browser where available. Specifically verify file/directory picker support, permission handling, download fallback, keyboard navigation, and responsive layout. Document any API-dependent limitations; do not promise universal directory-write support.

## Publisher tests (later)

Use a mock API client before any live publishing:
- no eligible groups,
- top group incomplete and later group complete,
- missing/unreadable image,
- failure before first post,
- failure after one or two posts,
- ambiguous API response,
- all three posts succeed but JSON write fails,
- successful group moves to top and becomes locked/published,
- next run selects the next group.

Live publishing tests require a controlled account and explicit user authorization. Verify right-to-left order before treating it as confirmed.
