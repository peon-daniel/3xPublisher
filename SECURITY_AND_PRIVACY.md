# Security and Privacy

## Local-first expectations

- The website should operate on user-selected local files and must not upload images or project data to a service unless a separately approved feature explicitly requires it.
- Explain browser permissions and any data sent to third parties.
- Do not add analytics, telemetry, remote AI services, or image hosting as an undocumented dependency.
- Do not modify source image files.

## Credentials

- The website must not request or store Instagram credentials in the initial release.
- The publisher must never store access tokens, passwords, or secrets in project JSON, image filenames, source code, or a committed configuration file.
- Before publisher implementation, choose a secure platform-appropriate credential storage approach and document token refresh/revocation behavior.
- Do not log secrets. Redact tokens from diagnostics.

## Repository and deployment

- Never commit real project JSON, personal images, access tokens, or user-specific data as test fixtures.
- Use synthetic images and fake credentials in tests.
- Keep secrets out of GitHub Pages client-side code: any secret embedded in static website assets is public.
- Review dependencies and deployment workflows before adding them.

## Browser and file access

- Request access only after a user action and only to files/folders needed for the selected project.
- Respect browser permission boundaries.
- Do not silently upload local files or overwrite user files.
- Make save/export destinations and results explicit.
