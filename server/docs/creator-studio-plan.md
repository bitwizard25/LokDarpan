# Creator Studio implementation plan

Spec: `docs/creator-studio-contract.md`. Keep all edits under server; preserve existing work, routes and envelopes; no commits.

- Add service and HTTP regression tests for owner authorization, safe responses, cursor pagination, handle conflicts, credential checks and invalid bodies; run before implementation.
- Extend video routes/controllers/services with creator listing, validated JSON and multipart edits, safe serialization and correct owner comparisons. Reuse existing storage deletion and document retained jobs.
- Extend channel model/routes/controllers/services with unique handles, public lookup/listing, updates, and confirmed deletion that makes owned videos private.
- Extend profile schema/routes/controllers/services with profile updates, bcrypt password changes, password-confirmed account deletion, and rejection of tokens for removed accounts.
- Run all existing tests and available lint scripts, check the diff and append actual request/response examples and deletion limitations to the contract.

Implementation choices: keep existing transcode statuses in storage, map them to creator-facing statuses; completed private/unlisted videos are unpublished. Cursor is a validated base64url ObjectId boundary, sorted descending by ID. Older channels receive a stable ID-based fallback handle until renamed. Public counts reflect published public videos and subscriptions stored on users. Channel/account deletion retains private video records and assets; existing video deletion attempts storage cleanup but does not cancel active jobs.
