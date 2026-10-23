# Website Functional Specification

## 1. Startup and project loading

- Provide a clear action to select/open the user's project folder or project JSON, subject to browser capabilities.
- If a valid project JSON is loaded, continue that project and reconcile its image references against available files.
- If no JSON exists or the user starts a new project, discovered images begin unassigned.
- New images discovered on reopening are added to Unassigned Photos.
- If folder scanning is not supported in the user's browser, offer a supported manual selection/import workflow and explain its limitations.
- Never imply that the site has saved to the local folder unless the write operation actually succeeded.

## 2. Main workspace

- Left pane: unassigned photos.
- Right pane: ordered three-post groups.
- Each group contains exactly three post slots; each post can contain a carousel.
- Keep one empty placeholder group at the bottom. It becomes a real group when content is added, after which a new empty placeholder appears.
- An empty placeholder is never included in exported `groups` or publisher input.

## 3. Photo assignment and editing

- Drag an unassigned photo onto a post to assign it.
- Dropping another photo onto a populated post adds it to that post's carousel.
- Reorder images within a carousel.
- Removing an image from a post returns it to Unassigned Photos.
- A photo may be assigned to only one post at a time.
- Allow descriptions to be edited for posts and unassigned images.
- Allow hashtags to be edited and saved independently from generated values.
- Applying a description to one or more selected unassigned images stores it for later use and does not create posts.
- Caption preview shows description (or `.`) + blank line + saved hashtags.

## 4. Dictionary and hashtags

- Provide a separate page/tab for dictionary management.
- Each identifier maps to one or more hashtags; identifiers and hashtag values may repeat across rules.
- Allow add, edit, and delete; provide filename interpretation and generated-hashtag preview.
- Parse identifiers from filenames according to `IMAGE_HANDLING.md`.
- Initial hashtags are derived from the first image assigned to a new/populated post only.
- Deduplicate hashtags within a post.
- Dictionary edits do not regenerate hashtags already saved in posts.
- Default limit is four unique hashtags per post, configurable in project settings. A per-post override takes precedence.
- Exceeding the effective limit produces a visible count/warning such as `5 / 4`; do not truncate or silently remove hashtags.

## 5. Ordering rules

- Published groups form a gray, locked block at the top.
- Unpublished groups appear below and can be reordered among themselves.
- Unpublished groups cannot be moved above published groups.
- Dragging a group moves its three posts as one unit.
- Within a group, a post can be reordered to another slot in that same group.
- A post can be moved outside its group only into an empty slot in another group; it must not push or rearrange occupied posts in another group.
- Clicking the outer group border selects the group; Up/Down can move it within the permitted unpublished range.
- Clicking an inner post selects that post; Up/Down reorders it within its group.
- Keyboard shortcuts must not fire while the user is typing in an input, textarea, or editable control.
- Published groups cannot be modified or reordered.

## 6. Group operations

- Hovering between groups reveals a `+` insertion affordance. Clicking inserts a new group with three empty post slots at that position.
- Deleting a group returns its images to Unassigned Photos.
- If a group contains images or descriptions, require confirmation before deletion.
- The always-present bottom placeholder is not a deletable committed group.

## 7. Preview

- Preview temporarily displays the next ready unpublished group at the very top of the published block to show the intended profile-grid appearance.
- Preview is a temporary projection; it must not change persistent order, publication state, or JSON.
- Cancel restores the original display.
- Preview offers an explicit confirm-and-publish action only as a future publisher-integrated workflow. In the initial website, it may be a visual confirmation action only; it must not claim to publish to Instagram.
- Explain that the preview models the intended profile-grid order and cannot guarantee every Instagram context will display identically.

## 8. Save and export

See `FILE_STORAGE_AND_EXPORT.md`. The UI must show dirty/saved/exported status and errors clearly.

## 9. Initial release boundaries

The website does not publish to Instagram, store tokens, schedule posts, or rely on a server-side database.
