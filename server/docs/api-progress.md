# API integration progress

Completion rule: an API is complete only after its production endpoint is connected to the intended UI, relevant checks pass, and its real data flow is verified. Mocked data or service tests alone do not satisfy completion.

## Updated execution order

The user requested implementation of the planned features first, followed by a combined backend/UI verification pass. The earlier one-API-at-a-time restriction is superseded for implementation order only. Implemented code stays awaiting verification until integrated with its UI and tested. Do not report unfinished or unverified features as complete.

## Channel eligibility — DigiLocker dependency

The user chose DigiLocker Aadhaar verification instead of manual admin approval. No DigiLocker credentials or provider account are available yet. Live verification is NOT IMPLEMENTED and is externally dependent on requester onboarding or an approved provider integration.

Required flow: authenticated user consents to DigiLocker verification, backend validates the provider result and binds it to that user, then successful verification enables channel creation. A frontend checkbox, uploaded image, or client-submitted verified flag must never grant eligibility. Store only the minimal verification outcome/reference needed; do not store Aadhaar numbers or document contents in the user profile. Do not add manual approval as a substitute.

Provider-specific callback validation, scopes, credentials, redirect registration, and any required document verification must be finalized from the approved integration documentation. Until then, keep this feature marked dependent on external setup; do not introduce a pretend-success verification route. The existing direct channel-creation endpoint predates this rule and still needs eligibility enforcement before the workflow can be marked complete.

Official onboarding sources checked: https://api.apisetu.gov.in/ and https://apisetu.gov.in/digilocker .

## Catalogue batch

Status: IMPLEMENTATION IN PROGRESS; not UI-integrated or tested in the combined pass yet. Added shared catalogue service/routes for categories, search, public channel details/videos, related videos, and explicit-state subscription changes. Existing video list/detail routes still need alignment with this public-safe DTO. These additions are not completion claims.

## Task 1 — GET /api/v1/home

Status: IN PROGRESS. At the user's request, remaining features are now implemented as a batch before the combined test pass. No API is marked complete until its UI integration and verification pass.

Scope: initial bounded Home feed, featured published video, available category filters, public-safe channel/card metadata, and existing homepage integration. Save, Search, catalogue pagination/See All, and Watch playback are separate API tasks. The homepage hides the unimplemented Save and See All controls for now.

Implemented:

- Home route, service, and MongoDB repository; published/playable/public filtering, bounded limits, safe projections, and category validation.
- Recorded-video hero with real view counts instead of a fabricated LIVE badge.
- Home loader consumes the endpoint; category navigation requests the endpoint again.
- Empty catalogue/category state, unavailable state, retry/reset controls, and navigation loading status.
- Existing layout, lazy-image component, and video card styling retained. Channel links use IDs when available.
- Explicit video/short and visibility schema fields; existing records without type remain ordinary videos. Shorts are not inferred from duration.

Verification required before COMPLETE:

- Backend tests and client typecheck/build.
- Actual MongoDB-backed populated/empty/category-filtered results in the browser, including private/unfinished exclusion.
- Browser retry and failure recovery; desktop/mobile layout and category navigation.

Environment: backend dependencies were absent at task start; installation is being verified. No backend environment file or running local MongoDB instance was found during inspection. No production database writes, seed data, or deployment were performed.

Design choices: Popular videos uses lifetime views, Latest videos uses creation time. This is not a time-window trending algorithm. The first version is a public feed, not personalized recommendations. Each row is limited to eight cards by the client (server permits one to twelve); pagination belongs to the next catalogue endpoint task.
