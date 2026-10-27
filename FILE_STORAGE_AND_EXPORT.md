# File Storage and Export

## Source of truth

The portable JSON project file stored alongside the images is the intended source of truth for project state. Browser storage may support recovery but must not be the only copy of the project.

Canonical proposed filename: `instagram-plan.json`. Numbered exports start at
`instagram-plan-001.json` and increment the highest recognized existing sequence by one,
using at least three digits. If the app cannot reliably identify the newest version, ask the
user to select the intended JSON instead of guessing.

## Browser constraints

A static website cannot universally assume permission to enumerate, create, or overwrite arbitrary files in a local folder. Use browser-supported file/directory picker APIs only when available and authorized. Provide a download/export fallback.

The file-access capability check reports the Open/Save/Directory Picker APIs and browser
download support independently. Reading an explicitly selected `File` does not require the
File System Access API. Direct writes use a user-selected writable file handle and are only
reported as saved after both the write and close complete successfully.

The Phase 2 shell imports only a user-selected JSON file and activates it only after parsing
and validation succeed. On browsers with the Save File Picker API, saving asks the user to
choose a destination. Otherwise, export starts a JSON download with an editable numbered
filename. The app does not check the selected folder for existing export JSON filenames, so
it cannot guarantee that the suggested export sequence is unused; the user must choose a
non-conflicting name.
Loading a project reports that it was loaded; it is not reported as a new save operation.

Image discovery is explicit. In Chrome and other browsers exposing the File System Access
directory picker, the app requests read-only access to a folder selected by the user, reads
its image files in the browser, and displays them in the planner. The image bytes are not
uploaded. Browsers without that API may use a directory file input, whose native chooser may
use generic “upload” wording; that wording does not mean the app sends the files to a server.
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
- If direct write access is available and the user granted permission, autosave may be used.
- If direct write is unavailable, provide an explicit export/download action and explain that the user must place the downloaded JSON in the project folder.
- A successfully initiated export clears the dirty flag and sets the status to exported/downloaded-needs-copy. Any later edit makes the project dirty again.
- Never overwrite an existing file without a supported, explicit user-authorized operation.
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
