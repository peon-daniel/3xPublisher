# Architecture

## 1. System boundary

The project has two independent applications sharing a JSON contract.

```text
User's project folder
  ├── image files (read-only to the application)
  ├── instagram-plan.json (or numbered version)
  └── future local publisher executable/script
           ▲                    ▲
           │ import/export      │ read/update after publishing
     Static website ────────────┘
       hosted on GitHub Pages
```

The website must not depend on the publisher being installed. The publisher must not depend on website runtime state.

## 2. Website responsibilities

Separate responsibilities into modules/components where useful:

- **Project I/O adapter:** folder/file selection, reading JSON, export/download, and save capability detection.
- **Project state/model:** canonical in-memory representation of groups, posts, images, dictionary, settings, and publication state.
- **Validation and migration:** schema validation, version checks, normalization, and safe handling of unsupported data.
- **Image catalog:** discover image files and reconcile them with saved references.
- **Layout operations:** assign/remove/reorder images, reorder groups/posts, insert/delete groups, hide/unhide unassigned images.
- **Caption/dictionary logic:** interpret filename identifiers, generate initial hashtags for newly populated posts, manage templates if included, and format previews.
- **Preview projection:** calculate temporary display order without mutating persistent project order.
- **UI:** render panes, group/post cards, selection, keyboard controls, warnings, save status, and previews.

Pure business logic should be testable without a browser DOM. UI code should call model operations rather than independently mutating arbitrary state.

## 3. Publisher responsibilities (later)

- Load and validate the same JSON schema.
- Resolve local image paths safely relative to the project folder.
- Identify the top-most unpublished group.
- Validate group readiness.
- Perform Instagram API workflow after eligibility, permissions, media hosting/transfer, and credential handling have been researched and approved.
- Mark a group published only after a reliable success condition.
- Write the updated JSON safely without corrupting the previous version.

The publisher should not regenerate saved hashtags from filenames or modify image files.

## 4. Data flow

1. User selects a folder or a JSON file, subject to browser support.
2. Website reads the selected JSON if supplied and scans the accessible folder for image files.
3. Validation and reconciliation create an in-memory project state.
4. User actions modify in-memory state and set the dirty/unsaved indicator.
5. The app saves through a supported file-system permission path if available; otherwise it exports a numbered JSON file and explains where the user must place it.
6. Publisher later reads that exported/current JSON, publishes one group, and writes publication state back to JSON.

## 5. Deployment

- Static assets only for the initial site.
- Deploy through GitHub Pages from the repository's chosen branch/folder or supported GitHub Actions workflow; inspect repository setup before choosing.
- No secrets in source code, repository settings exposed to client-side code, or JSON.
- Any framework/build system is an implementation choice, not a confirmed product requirement. Prefer the simplest maintainable approach that fits the existing repository and GitHub Pages.

## 6. Architectural constraints

- Do not assume a browser can enumerate or write to arbitrary local folders without explicit user selection and supported APIs.
- Do not use cloud upload as an undocumented fallback.
- Do not let temporary preview reorder the canonical project model.
- Do not let UI sorting silently change the stored order unless the user explicitly performs a reorder.
- Treat JSON as the cross-component contract and document any schema change.
