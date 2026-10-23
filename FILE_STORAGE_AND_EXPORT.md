# File Storage and Export

## Source of truth

The portable JSON project file stored alongside the images is the intended source of truth for project state. Browser storage may support recovery but must not be the only copy of the project.

Canonical proposed filename: `instagram-plan.json`. Numbered exports should use an incremental, documented pattern. If the app cannot reliably identify the newest version, ask the user to select the intended JSON instead of guessing.

## Browser constraints

A static website cannot universally assume permission to enumerate, create, or overwrite arbitrary files in a local folder. Use browser-supported file/directory picker APIs only when available and authorized. Provide a download/export fallback.

Do not claim autosave succeeded unless the browser reports successful completion of the write. The UI must distinguish:
- changes not yet saved/exported,
- successfully saved to the selected file,
- exported/downloaded but not yet copied back into the project folder,
- save/export failure.

## Save behavior

- Track changes to layout, descriptions, hashtags, hidden state, dictionary, and settings.
- Show a red unsaved notice whenever current state differs from the last successfully persisted/exported state.
- If direct write access is available and the user granted permission, autosave may be used.
- If direct write is unavailable, provide an explicit export/download action and explain that the user must place the downloaded JSON in the project folder.
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
