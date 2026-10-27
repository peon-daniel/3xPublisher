# UI / UX Specification

## Main layout

Use a compact project toolbar above the workspace. It provides the Planner and Dictionary
views, project save/export actions, and a visible persistence status. Before a project is
loaded, show a focused folder-selection panel; hide it after successful load.

Use a two-pane workspace:
- **Unassigned Photos** in a left rail with at least three columns of equal-size square thumbnails and a control to show hidden images.
- **3x post groups** on the right, ordered vertically, with each group's three post previews side-by-side.

A “3x post group” is one outer container holding exactly three post cards. Each post card represents one Instagram post and may hold multiple carousel images.

## Visual states

- Published groups: gray and locked; always above unpublished groups.
- Unpublished groups: editable and reorderable within the unpublished region.
- Empty bottom placeholder: visually distinct as a workspace target, but not a committed group.
- Unsaved changes: prominent red notice/flag until a successful save/export establishes a saved state.
- Hashtag limit exceeded: visible warning/count and caption preview emphasis; do not silently truncate.

## Drag and drop

- Drag images from Unassigned Photos into a post.
- Click a photo to select it; Ctrl-click (or Cmd-click on macOS) adds or removes photos from
  the selection. Highlight selected thumbnails with a border.
- Drag any selected thumbnail to reorder the selected photos together or drop them into a
  post as a carousel.
- The same selected photos can receive a shared description using the bulk description field.
- Drop onto an occupied post to append to its carousel.
- Reorder carousel images directly.
- Remove image to return it to unassigned list.
- Drag groups as a whole within the unpublished region.
- Reorder a post within its own group.
- Move a post across groups only to an empty destination slot; never push occupied posts around.
- Drag/drop must respect locked published groups and must not permit moving an unpublished group above them.
- Provide non-drag alternatives where practical, such as keyboard ordering and explicit remove/move controls.

## Selection and keyboard

- Clicking the outer border selects the group.
- Clicking an inner post selects that post without accidentally triggering group selection.
- Up/Down moves a selected group among eligible unpublished groups or reorders a selected post within its group.
- Do not intercept arrow keys while typing or while focus is inside an editable control.
- Show a visible selection state and ensure outer and inner hit areas are unambiguous.

## Carousel and grid preview

- Normal grid preview shows only the lead/thumbnail image for each post.
- The default post thumbnail uses a 3:4 profile-grid crop; selecting it toggles to a contained
  4:5 portrait preview so the full image can be inspected.
- Hovering a post with a carousel shows all carousel images, both in the planner and preview.
- Carousel order must be visible and editable.
- Photo hover controls overlay the thumbnail and must not shift neighboring thumbnails.
- Keep the loaded photo rail free of a separate photo-import heading and add-photos block.
- Show descriptions on post hover or keyboard focus. Selecting a post reveals its editing and
  ordering controls; selection must also be operable by touch.
- Previewing a group temporarily places it at the top of the published block without mutating saved order.

## Captions and descriptions

- Display a caption preview using `description-or-dot`, a blank line, then hashtags.
- New post description defaults to literal `.`.
- Support @mentions as ordinary text in descriptions; do not invent account lookup or mention-autocomplete behavior.
- If reusable description templates are implemented, treat them as an optional extension. Applying or editing a template must not rewrite existing descriptions automatically.
- Allow one description to be applied to multiple selected unassigned images.

## Accessibility and responsive behavior

- Make core actions usable by keyboard, provide focus indicators, and use labels for controls.
- Do not rely on color alone for published/unsaved/warning states.
- Provide a usable layout at narrower viewport widths; exact breakpoints are an implementation choice.
- At narrow widths, place the photo rail above the groups and keep the three post previews in
  a horizontal row.
- Drag-and-drop should have an alternative interaction for users or devices where dragging is difficult.

## Confirmations

- Confirm deletion of a populated group.
- Explain export/save destination and status.
- For destructive or ambiguous operations, preserve data and offer cancel rather than silently discarding content.
