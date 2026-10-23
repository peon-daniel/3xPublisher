# Instagram Integration

## Current scope

The initial website does not connect to Instagram and must not request, store, or use Instagram access tokens. This document records the research and design requirements for the future local publisher.

## Research required before publisher implementation

Use current official Meta/Instagram documentation at implementation time. Verify and cite the exact supported APIs and restrictions rather than relying on assumptions.

1. Eligible account type and account-linking prerequisites.
2. Required permissions, app configuration, review, and token lifecycle.
3. Whether the intended account can publish the required media types and carousels through the official API.
4. Media container creation, processing status, publish calls, rate limits, and error handling.
5. How the API consumes media: local filesystem paths cannot simply be assumed to be accessible to a remote API. Determine an approved media transfer/hosting workflow that does not introduce an unapproved backend or expose images publicly without consent.
6. How to establish success for each post and for the complete three-post group.
7. Whether publication order produces the intended grid. Test the proposed third-to-first sequence.
8. Any current restrictions on mentions, hashtags, captions, and carousel content.

## Constraints

- Do not implement unofficial scraping, browser automation, or credential collection as a shortcut.
- Do not hardcode tokens or store credentials in `instagram-plan.json`.
- Do not claim that commercial services eliminate all account authorization requirements without verifying the service and permission model.
- Do not implement future scheduling or add schedule fields to JSON unless separately approved.
- If API requirements imply a server, media host, or other infrastructure that conflicts with the local-first architecture, stop and present the trade-offs before proceeding.

## Publishing state

The publisher marks a group published only after all three posts have succeeded according to the verified workflow. If the outcome is partial or ambiguous, leave it unpublished, explain what may have happened, and instruct the user to inspect Instagram before retrying.
