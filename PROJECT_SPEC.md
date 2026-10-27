# Project Specification

## 1. Objective

Help a user plan Instagram profile-grid content by organizing local photographs into ordered groups of exactly three Instagram posts, each of which may itself contain a carousel of multiple images. The tool stores post descriptions and hashtags and previews the intended grid order before the user publishes.

## 2. Intended users

People who manage their own Instagram content and want to plan a consistent three-post grid using local image files. The project is open source and intended to be usable by the public through a GitHub Pages website.

## 3. Product principles

- Local-first: user-selected images and the JSON project file are the working materials.
- Non-destructive: source images are never modified by the website or publisher.
- Portable: project state is stored in a documented JSON file alongside the images.
- Explicit: unsaved changes and validation problems must be visible.
- Incremental: the website is implemented first; the publisher follows only after the data contract is stable.
- No silent content changes: dictionary edits do not rewrite existing post hashtags or descriptions.
- No invented publishing success: the publisher marks a group published only after its defined success condition is met.

## 4. Architecture and scope

### Initial deliverable
A static website hosted on GitHub Pages. It has no project-specific server and must not require a backend for its core planning features. Users select a local folder containing images and optionally an existing project JSON file.

### Later deliverable
A separate local publisher program, initially developed in Python and potentially packaged as a standalone executable. The user runs it from the project folder. It reads the JSON, publishes at most one group per run, updates the JSON, and exits. The publisher does not call or depend on the website.

### Shared contract
The JSON project file is the only planned interface between the website and publisher. Credentials are separate and must not be placed in project JSON.

## 5. Core website behavior

- Show unassigned photos in a left pane and three-post groups in a right pane.
- Use a compact top toolbar and a folder-first project startup. After a project loads, hide
  the startup panel and show project navigation, save/export actions, and persistence status.
- In the workspace, show the photo catalog as a left rail and the three post previews within
  each group side by side; keep the workspace usable on narrow screens.
- Support assigning photos, making carousels, reordering carousel images, editing descriptions and hashtags, and moving groups/posts under the rules in `UI_UX_SPEC.md`.
- Keep one empty three-post placeholder at the bottom. It is not a committed group until content is added.
- Keep published groups in a locked, gray block at the top.
- Support a temporary preview that places the next ready unpublished group at the top for visualizing the expected grid. Cancel must restore the prior display and must not modify persistent order or JSON.
- Persist hidden-image state, custom unassigned-image order, dictionary rules, settings, group/post data, and publication state in JSON.
- Display a clear unsaved-change indicator when current state differs from the last successfully saved/exported project file.
- In browsers supporting the directory picker, autosave project JSON to the user-selected
  folder after explicit read/write permission. Keep the folder handle for the current page
  session only and offer export when autosave is unavailable or fails.
- Export a numbered JSON file when direct saving to the selected folder is not available.

## 6. Image and post rules

- A three-post group always has exactly three post slots.
- Each post has one or more images when populated; multiple images form a carousel.
- The first image in a post is the lead image for thumbnail, filename-derived initial hashtags, and carousel preview.
- Hashtags are initially derived from the first image only. Changing the first image does not regenerate already-saved hashtags.
- Duplicate hashtags in a post are removed.
- Default hashtag limit: four unique hashtags per post. It is configurable and can be overridden per post. Exceeding the limit produces a visible warning; hashtags are not silently truncated.
- Description and hashtags are optional for publication readiness. An empty description, `.` placeholder, or full description with or without hashtags is acceptable.
- A newly created post's default description is the literal `.` placeholder.
- Caption preview format: description (or `.`) followed by a blank line and saved hashtags.
- Filename identifiers and dictionary interpretation are defined in `IMAGE_HANDLING.md`.

## 7. Publication rules (future publisher)

- A run attempts to publish only the top-most unpublished group.
- It must not skip an incomplete top-most unpublished group to publish a later group.
- A group is ready when all three posts have at least one image. Description and hashtags are not readiness requirements.
- One run publishes one group, then exits.
- After confirmed success, mark the group published and move it to the top of the published block, preserving the relative order of groups already published.
- On failure, do not mark the group published. No separate `failed` state is defined.
- Partial publication is a known risk. The user is responsible for checking Instagram before retrying after an ambiguous/partial result; publisher error messaging should make this clear.
- Within a group, the likely publication sequence is right-to-left (third, second, first) to obtain the intended grid arrangement. This must be verified in an isolated test before being treated as proven.

## 8. Out of scope for the initial website

- Instagram publishing from the website.
- Credentials or tokens in JSON.
- Scheduling and future-post queue fields in JSON.
- Cloud storage, accounts, databases, or a custom backend.
- Automatic rewriting of existing captions when dictionary rules change.
- Editing original image bytes or metadata.
- A guarantee that the website can automatically discover or overwrite arbitrary files in a selected local folder in every browser.

## 9. Quality requirements

The application must validate imported JSON, preserve user data when recovering from errors, explain unsupported browser file access, and test data transformations independently of UI interactions. See `ERROR_HANDLING.md`, `SECURITY_AND_PRIVACY.md`, and `TESTING.md`.
