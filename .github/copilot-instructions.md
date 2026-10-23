# GitHub Copilot Instructions for 3xPublisher

## Read before coding

For project-wide work, read `README.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`, `DECISIONS.md`, and `DEVELOPMENT_PLAN.md`. Before changing a feature, read its relevant specification under the root directory. Do not implement from a short prompt alone when a relevant spec exists.

## Authority and conflict resolution

1. Confirmed product decisions in `DECISIONS.md` and requirements in `PROJECT_SPEC.md` are authoritative.
2. `DATA_SCHEMA.md` is the single source for the proposed shared JSON contract; it remains provisional until reviewed in Phase 0. Do not create a parallel schema.
3. Feature specifications define detailed behavior for their area.
4. `DEVELOPMENT_PLAN.md` controls implementation order.
5. If documents conflict, do not silently choose. Identify the conflict, explain the affected behavior, and ask for clarification. Update all affected docs after a decision.
6. Treat items labeled proposal/open/unresolved as such; never describe them as previously agreed facts.

## Workflow

- Inspect the existing repository, current files, dependencies, and GitHub Pages configuration before modifying anything.
- Implement only the current phase and requested scope. Do not generate the whole application in one pass.
- Before coding a phase, summarize intended changes and any essential unresolved decisions.
- Prefer small, testable changes and keep business logic separate from DOM/UI code.
- After changes, run the relevant tests/build/lint commands that actually exist. Report commands run and results honestly.
- If tests cannot run, say why and provide the next verification step.
- Update documentation when an implementation decision, schema, dependency, or behavior changes.
- Do not start publisher or scheduling implementation while working on initial website phases.

## Non-negotiable constraints

- Never modify, rename, move, compress, or delete user source images.
- Never silently discard project data or replace an invalid/unsupported JSON file with a blank project.
- Do not claim local autosave succeeded unless the write actually succeeded.
- Do not assume browsers can read/write arbitrary folders without explicit user selection and API support.
- Do not upload local images or project JSON to a server/service unless separately approved and documented.
- Never place credentials, tokens, or secrets in JSON, source code, client-side assets, logs, or committed test fixtures.
- Do not regenerate saved hashtags after dictionary edits or lead-image changes.
- Keep the bottom placeholder group out of serialized JSON.
- Published groups stay locked at the top. Unpublished groups cannot be dragged above them.
- Descriptions and hashtags are optional for publishing readiness; all three posts must contain at least one image.
- The publisher must not skip an incomplete top-most unpublished group.
- Do not add a `failed` publication state or scheduling fields unless explicitly approved.
- Preview must not mutate permanent order or serialized project state.

## Quality bar

- Add tests for business rules and edge cases, not just happy paths.
- Use synthetic test data; do not commit personal images or real credentials.
- Keep UI errors understandable and actionable.
- Preserve existing repository work and avoid unnecessary dependencies.
- Before destructive edits or broad refactors, explain the impact and ask when user data or established behavior could be affected.
