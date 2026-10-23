# Data Schema

## Status and authority

This document defines a **proposed v1 implementation contract** to make the website work independently and give the future publisher a stable interface. The overall requirement for a portable JSON project file is confirmed; the exact field names and nesting below are implementation proposals and must be reviewed during Phase 0 before the publisher is built. Do not invent a second competing schema.

Canonical filename: `instagram-plan.json`. Numbered exports use zero-padded three digits: `instagram-plan-001.json`, `instagram-plan-002.json`, etc. Import must allow the user to select the intended file when automatic discovery is unavailable.

## Proposed top-level structure

```json
{
  "schemaVersion": 1,
  "project": {
    "id": "project-id",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  "settings": {
    "defaultHashtagLimit": 4
  },
  "dictionary": {
    "eye3": ["#konicaeye"],
    "halfframe": ["#halfframe"],
    "a100": ["#aerocolor"],
    "rodinal": ["#rodinal"],
    "fd": ["#konicac35fd", "#konicaautos3"]
  },
  "images": [
    {
      "filename": "P123456_eye3, halfframe, a100, rodinal.jpg",
      "hidden": false,
      "unassignedOrder": null,
      "description": ""
    }
  ],
  "groups": [
    {
      "id": "group-id",
      "publicationStatus": "not ready",
      "publishedAt": null,
      "posts": [
        {
          "id": "post-1",
          "images": ["P123456_eye3, halfframe, a100, rodinal.jpg"],
          "description": ".",
          "hashtags": ["#konicaeye", "#halfframe", "#aerocolor", "#rodinal"],
          "hashtagLimitOverride": null
        },
        { "id": "post-2", "images": [], "description": ".", "hashtags": [], "hashtagLimitOverride": null },
        { "id": "post-3", "images": [], "description": ".", "hashtags": [], "hashtagLimitOverride": null }
      ]
    }
  ]
}
```

This example illustrates the proposed shape; timestamps, IDs, and sample content are not prescribed values.

## Field rules

### Top-level
- `schemaVersion`: integer. Reject or open read-only with a clear message if unsupported; never silently discard unknown-version data.
- `project`: project metadata.
- `settings.defaultHashtagLimit`: non-negative integer; initial default is `4`.
- `dictionary`: map from normalized identifier to an array of hashtags. A key can map to multiple hashtags. Different keys may map to the same hashtag.
- `images`: image catalog and unassigned-image metadata. Filenames are the portable references; never store absolute paths as the only reference.
- `groups`: persistent group order. The empty UI placeholder is not stored as a committed group.

### Images
- `filename`: exact filename as found in the selected project folder. Filename collisions in different subfolders are ambiguous and must not be silently treated as unique. Automatic reconciliation for ambiguous duplicates must stop and request explicit user resolution.
- `hidden`: whether the image is hidden while unassigned. Hiding is not deletion.
- `unassignedOrder`: optional explicit ordering key/index for custom unassigned order; `null` means use default alphabetical ordering unless the implementation adopts a documented equivalent.
- `description`: optional saved description for an unassigned image. Applying it does not create a post.
- An image should be either assigned to one post or unassigned, not assigned to multiple posts, unless a later decision explicitly changes this rule.

### Groups and posts
- Each committed group contains exactly three posts.
- `publicationStatus` uses exactly `ready`, `published`, or `not ready`. This field is stored in JSON, normalized on load, and recomputed after edits that change readiness.
- Published groups are displayed in the top locked block. The newest successfully published group moves to the top of that block.
- Each post's `images` array preserves carousel order. The first entry is the lead image.
- `description` stores the user-edited description, with `.` as the default placeholder for a new post.
- `hashtags` stores the saved hashtag strings. Publisher uses these values; it must not regenerate them.
- `hashtagLimitOverride`: `null` means use project default; a number means an explicit per-post override. Changing the default must not erase an override.
- `publishedAt` is an optional group-level timestamp set on success. No credentials, access tokens, scheduling fields, or `failed` state belong in this schema.

## Publication status normalization

- `published`: the group was successfully published according to the publisher's verified success condition; it is locked.
- `ready`: all three posts have at least one image and the group is the eligible next group, or is otherwise marked ready by the agreed implementation rule.
- `not ready`: one or more post slots lacks an image.
- The publisher must still validate actual image presence before attempting publication; a stale status cannot override validation.
- Descriptions and hashtags are not readiness requirements.

## Serialization and migration

- Validate before using imported data.
- Preserve fields the current version understands. Do not silently drop unknown data on save; for unknown schema versions, prefer read-only mode and ask the user to export/backup before any conversion.
- Any schema migration must be explicit, tested, and documented.
- JSON writes/exports must be UTF-8 and valid JSON. Stable formatting is encouraged for diffs.
- The empty placeholder group is a UI-only object and must not be serialized or published.

## Open contract points

Before the publisher phase, confirm any additional portability constraints discovered during implementation (for example, browser-specific file metadata limitations). Any approved change must update this file and tests first.
