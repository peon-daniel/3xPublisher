# 3xPublisher

3xPublisher is an open-source project-planning tool for preparing Instagram posts in groups of three so the intended Instagram profile-grid order can be planned before publication.

The first deliverable is a static website hosted on GitHub Pages. It works with a user-selected local project folder containing image files and a JSON project file. It organizes images into three-post groups, stores post descriptions and hashtags, previews the intended grid, and exports project data. A separate local publisher program is a later phase; the website and publisher communicate only through the JSON file.

**The website must never edit, rename, move, compress, or delete source images.** The JSON file is the portable project record. Publishing credentials must never be stored in it.

## Current scope

- **First:** static planning website and a documented, versioned JSON contract.
- **Later:** local publisher that processes one eligible group per run and updates the same JSON file after successful publication.
- **Not in initial scope:** scheduling, direct website-to-Instagram publishing, server-side storage, or a backend service.

## Documentation index

| File | Purpose |
|---|---|
| `PROJECT_SPEC.md` | Product goals, scope, confirmed behavior, and constraints |
| `ARCHITECTURE.md` | Component boundaries and data flow |
| `DATA_SCHEMA.md` | Proposed versioned JSON contract shared by website and publisher |
| `WEBSITE_SPEC.md` | Website behavior and functional requirements |
| `UI_UX_SPEC.md` | Layout, interaction, ordering, and accessibility expectations |
| `IMAGE_HANDLING.md` | Image discovery, assignment, carousel, and missing-file rules |
| `FILE_STORAGE_AND_EXPORT.md` | Browser file access, autosave, export, and recovery |
| `PUBLISHER_SPEC.md` | Later local publisher behavior and readiness rules |
| `INSTAGRAM_INTEGRATION.md` | Instagram API constraints and verification required before implementation |
| `ERROR_HANDLING.md` | Validation, recoverability, and user-facing errors |
| `SECURITY_AND_PRIVACY.md` | Local-first privacy and credential rules |
| `DEVELOPMENT_PLAN.md` | Phased implementation plan and gates |
| `TESTING.md` | Test strategy and acceptance criteria |
| `DECISIONS.md` | Confirmed decisions, implementation proposals, and unresolved items |
| `.github/copilot-instructions.md` | Repository-wide instructions for GitHub Copilot |

## Read first

1. `README.md`
2. `.github/copilot-instructions.md`
3. `PROJECT_SPEC.md`
4. `ARCHITECTURE.md`
5. `DATA_SCHEMA.md`
6. `DEVELOPMENT_PLAN.md`

Copilot should then read the relevant feature specifications before starting each phase.

## Use the planner

1. Open the planner and select an existing project JSON file, or start a new project.
2. Add image files or reconcile against a user-selected image folder when the browser supports it.
3. Organize images into three-post groups, edit descriptions and saved hashtags, and use preview to check the planned grid.
4. Save to a user-selected JSON file when supported. Otherwise, export the download and copy it into the project folder.
5. To continue later, open the saved or copied JSON file. Keep a separate backup of important project files.

The planner runs in the browser and does not publish to Instagram. Source images are not modified. Folder access and direct file saving depend on browser support and explicit user selection; the planner does not upload project data to a service.

## Deployment to GitHub Pages

The repository includes a GitHub Actions Pages workflow at `.github/workflows/pages.yml`. It runs on pushes to `main` and manual dispatch, installs dependencies with `npm ci`, runs `npm test`, builds the static site with `npm run build`, and deploys the `dist` directory.

To publish the site:

1. Push the repository to GitHub.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
3. Push to `main`, or run **Deploy static site to GitHub Pages** from the **Actions** tab.
4. Wait for the workflow to complete, then open the Pages URL shown in the `github-pages` deployment environment.

The built site is static; user-selected project JSON and images are not part of the deployment artifact. Do not commit personal images, project JSON, or credentials.

## Implementation status

The static planner currently supports project import/export, image catalog reconciliation, group and carousel organization, dictionary-based initial hashtag generation, caption editing, preview, and save-state feedback. The project is in the release/deployment phase; Instagram publishing and scheduling remain out of scope.

## Local setup commands

1. Install Node.js 20+ and npm.
2. In WSL, ensure Linux Node is used (not Windows `npm` from `/mnt/c/...`).
	If needed:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install
nvm use
```

	The repo pins Node major version in `.nvmrc`.
3. Install dependencies:

```bash
npm install
```

4. Run the development server:

```bash
npm run dev
```

5. Run unit tests:

```bash
npm test
```

6. Build static output:

```bash
npm run build
```
