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

## Start in VS Code

1. Create or open the GitHub repository in VS Code.
2. Add these documentation files without overwriting any existing project work.
3. Ask Copilot to inspect the repository and summarize the current structure and the documentation's implementation sequence. Do not ask it to build everything at once.
4. Implement Phase 0 and Phase 1 in `DEVELOPMENT_PLAN.md` first. Confirm the proposed schema and technical baseline before substantial implementation.
5. Run the tests required by each phase and review the diff before accepting changes.

## Recommended first Copilot prompt

> Read `.github/copilot-instructions.md`, `README.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`, and `DEVELOPMENT_PLAN.md`. Inspect the existing repository before changing anything. Do not write application code yet. Report: (1) the current repository structure, (2) any conflicts between existing files and the documentation, (3) the proposed implementation stack and why it fits a static GitHub Pages app, (4) any essential decisions that need my approval, and (5) a concrete checklist for Phase 0 only. Do not implement later phases or the publisher.

## Project status

This package is a handover specification, not application code. The JSON structure and technical choices identified as proposals in `DECISIONS.md` are implementation proposals, not claims that those exact details were previously agreed.

## Phase 1 scaffold status

A minimal static web scaffold and unit-test harness are now in place for Phase 1.

- Entry point: `index.html` and `src/main.ts`
- Styling baseline: `src/styles.css`
- Unit-testable module example: `src/core/smoke.ts`
- Test example: `src/core/smoke.test.ts`
- Build/test tooling: `package.json`, `tsconfig.json`, `vite.config.ts`
- Pages workflow: `.github/workflows/pages.yml`

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
