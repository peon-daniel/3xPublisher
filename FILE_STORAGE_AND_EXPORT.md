# File Storage and Export

## Source of truth

The portable JSON project file stored alongside the images is the intended source of truth for project state. Browser storage may support recovery but must not be the only copy of the project.

Canonical proposed filename: `instagram-plan.json`. Numbered exports start at
`instagram-plan-001.json` and increment the highest recognized existing sequence by one,
using at least three digits. When opening a selected project folder, the highest numbered
recognized file is loaded; the canonical file is used only when no numbered file exists.
Unrelated JSON files are ignored. If a recognized candidate cannot be read or validated, keep
the current in-memory project and report the error rather than starting with a blank project.

## Browser constraints

A static website cannot universally assume permission to enumerate, create, or overwrite arbitrary files in a local folder. Use browser-supported file/directory picker APIs only when available and authorized. Provide a download/export fallback.

The file-access capability check reports the Open/Save/Directory Picker APIs and browser
download support independently. Reading an explicitly selected `File` does not require the
File System Access API. Direct writes use a user-selected writable file handle and are only
reported as saved after both the write and close complete successfully.

The folder-first workflow requires an explicit user gesture to select the project folder. In
Chromium, the app requests read/write permission to that selected folder so it can update the
project JSON; image files are only read and are never modified. The folder handle exists only
in the current page session and must be selected again after a reload. A selected JSON file is
activated only after parsing and validation succeed. Browsers without the directory picker
use a manual file workflow and cannot provide this folder autosave.

When opening a folder, the app selects the highest numbered recognized project file, falling
back to `instagram-plan.json`. If none exists, it starts a new project and creates that
canonical file on the first change. Existing recognized JSON files are updated only after the
user explicitly selects the folder and grants the requested access. Direct writes use the
browser's safe writable-file stream and are only reported as saved after both write and close
complete successfully. Loading a project is reported as loaded, not as a new save operation.

When direct folder writing is unavailable or fails, the user can export a numbered JSON
download. The app does not know whether the browser completed the download or whether the
user copied it into the project folder, so the status says that copying is still required.

Image discovery is explicit. In Chrome and other browsers exposing the File System Access
directory picker, the app reads image files in the browser from the folder selected by the
user. The image bytes are not uploaded. Browsers without that API may use a directory file
input, whose native chooser may use generic “upload” wording; that wording does not mean the
app sends the files to a server.
When only individual file selection is available, selected images are added without treating
other catalog entries as missing. Folder reconciliation reports and leaves duplicate basenames
unresolved until the user chooses the intended relative path. The choice is session-only
because the v1 project schema stores filenames, not relative paths.

Do not claim autosave succeeded unless the browser reports successful completion of the write. The UI must distinguish:
- changes not yet saved/exported,
- successfully saved to the selected file,
- exported/downloaded but not yet copied back into the project folder,
- save/export failure.

After the browser download request is triggered, the dirty indicator clears because the current
state has been handed off for export. The browser does not report whether the user completed
the download or copied the file into the project folder, so the UI must describe it as an
initiated download that still needs copying—not as a save to the selected project file.

## Save behavior

- Track changes to layout, descriptions, hashtags, hidden state, dictionary, and settings.
- Show a red unsaved notice whenever current state differs from the last successfully persisted/exported state.
- If direct write access is available and the user granted permission, autosave is used after
  project edits. Autosave is debounced; an explicit Save now action also writes the latest
  project snapshot to the selected folder.
- If direct write is unavailable, provide an explicit export/download action and explain that the user must place the downloaded JSON in the project folder.
- A successfully initiated export clears the dirty flag and sets the status to exported/downloaded-needs-copy. Any later edit makes the project dirty again.
- Never overwrite an existing project file without a supported, explicit user-authorized
  folder selection and write permission.
- Keep the previous project file intact if writing fails.
- Export valid UTF-8 JSON with a schema version.
- Offer recovery from in-memory state or browser-local recovery where possible, but do not present browser storage as a substitute for a downloaded project file.

## Loading and version selection

- If a JSON exists at the top level and can be accessed, offer to load it.
- When several numbered JSON files exist, use a deterministic documented naming/version rule only when all candidates are accessible and unambiguous; otherwise ask the user to select one.
- If no JSON is selected, create a new project with all discovered images unassigned.
- Validate before loading into active state.
- Never silently replace an unreadable or unsupported project file with a blank project.

## Safe writes and recovery

- Serialize to a new output or use the browser's supported safe-write mechanism.
- On write failure, retain the current in-memory state and keep the dirty indicator visible.
- Before risky migration or reconciliation, provide a backup/export opportunity where practical.
- Do not modify source images as part of any save operation.
