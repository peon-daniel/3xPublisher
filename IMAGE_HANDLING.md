# Image Handling

## Non-destructive requirement

The website and publisher must not edit, rename, move, compress, delete, or otherwise modify original image files. Image files are inputs only. All organization and content metadata lives in project JSON.

## Discovery and references

- Scan only folders/files the user explicitly selects and the browser can access.
- When a complete selected folder is available, reconcile its image filenames against the project catalog. Manually selected image files are an incomplete source: add those files but do not infer that unselected files are missing.
- Treat files as images when the browser reports an `image/*` MIME type or when the filename uses a recognized fallback extension: `.avif`, `.bmp`, `.gif`, `.heic`, `.heif`, `.jpeg`, `.jpg`, `.png`, `.tif`, `.tiff`, or `.webp`.
- Use filenames as portable references in JSON, not absolute paths as the only identity.
- On reopening, match saved image references against the selected folder's available files.
- New images found in the folder are added to Unassigned Photos.
- If the same filename exists in multiple subfolders, do not silently choose one; report the ambiguity and require a documented resolution.
- Ambiguous discovered filenames are excluded from automatic matching and addition. The user can explicitly choose which relative path to use for the current session. Existing catalog and post references using that filename are kept unchanged until a choice is made. The v1 JSON stores filenames rather than relative paths, so this path-level choice is not persisted and must be confirmed again after reopening the project.
- The application must explain when browser limitations prevent recursive folder scanning or direct file access.

## Missing-image reconciliation

Apply these rules when a saved image reference no longer resolves:

1. **Missing image in a carousel:** remove the missing reference and retain the other images.
2. **Missing lead image:** the next remaining carousel image becomes the lead image. Keep saved description and hashtags unchanged; do not regenerate hashtags automatically.
3. **Last/only image disappears from an unpublished post:** reset the post to empty and clear its description and hashtags.
4. **Last/only image disappears from a published post:** show an empty post but preserve description, publication history, and published/locked group state.
5. Missing images in a published group never undo its published status.
6. Report reconciliation changes before they are committed/exported where practical, and preserve a recovery copy if possible.

## Assignment and carousels

- A post may contain one or more images in an ordered carousel.
- The first image is the lead image used for the grid thumbnail and initial hashtag generation.
- An image removed from a post returns to Unassigned Photos.
- Do not assign the same image to multiple posts unless a future explicit requirement changes this.
- Reordering carousel images changes which image is first but does not automatically regenerate saved hashtags.

## Filename identifier parsing

Example filename:

`P123456_eye3, halfframe, a100, rodinal.jpg`

- `P123456` is an image identifier and is not a hashtag.
- Identifiers may appear in different orders.
- Example dictionary mappings: `eye3` → `#konicaeye`; `halfframe` → `#halfframe`; `a100` → `#aerocolor`; `rodinal` → `#rodinal`.
- One identifier may map to multiple hashtags, e.g. `fd` → `#konicac35fd` and `#konicaautos3`.
- Different identifiers may map to the same hashtag.
- Duplicate generated hashtags within a post are removed.
- No category hierarchy is required.

Filename identifiers are parsed with the deterministic rules below; the image ID is not treated as a hashtag.

### Phase 5 parsing rules

- Remove the final filename extension before tokenization.
- Split the remaining stem on commas, underscores, hyphens, or whitespace.
- Ignore the first non-empty token as the image ID; all later tokens are candidate identifiers.
- Match identifiers case-insensitively.
- Walk identifiers in filename order and hashtags in dictionary order.
- Trim dictionary hashtag values, skip empty values, and remove duplicates case-insensitively while preserving the first value's spelling and position.
- For example, `P8260673_d3, fp100, halfframe, rodinal.jpg` parses to `d3`, `fp100`, `halfframe`, and `rodinal`.

## Embedded XMP subjects

- When an image contains readable XMP `dc:subject` values, use those as its identifiers in
  preference to filename-derived identifiers.
- Strip leading `#` characters, trim whitespace, and replace internal whitespace with
  underscores. Deduplicate identifiers case-insensitively while preserving their first-seen
  order.
- If XMP subjects are absent or unsupported, use the filename parsing rules above.
- XMP is read locally from selected image bytes. It is not written back to image files or
  stored in project JSON.
- For dictionary review, show unknown identifiers as suggested rules mapping `identifier` to
  `#identifier`. Suggestions are not applied automatically; each can be accepted or dismissed.
- When a new post receives its first image, use the resolved XMP identifiers when available,
  otherwise use filename identifiers, to generate its initial saved hashtags. Existing saved
  hashtags are not regenerated after dictionary edits or lead-image changes.

## Hidden and unassigned ordering

- Images are visible in Unassigned Photos unless JSON marks them hidden.
- Hidden images are not deleted from disk; a bottom-of-pane control reveals them.
- Unassigned images are alphabetically sorted by default.
- Users may reorder one or more selected images via drag/drop; preserve that custom order in JSON.
- Up/Down controls provide an accessible alternative. Assigning an image clears its unassigned order; if it is later removed, it returns to the default alphabetical position until reordered again.
- Per-image descriptions may be stored while images are unassigned. Applying a description does not automatically create a post.
