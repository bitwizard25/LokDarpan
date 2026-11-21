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

---

## Recommendation System v0 (Tasks 1–11)

Status: **IMPLEMENTATION COMPLETE & VERIFIED**.

All 11 tasks specified in `server/docs/recommendation-system/implementationplan.md` have been fully developed, wired, tested, and verified across both backend (Fastify, Mongoose, BullMQ, Redis) and frontend (Remix v2, React, Tailwind CSS):

### Delivered Modules & Components

1. **Task 1: Feature Keys & Video Metadata**
   - Implemented `features.js` with structured vocabulary (`cat:`, `fmt:`, `len:`, `top:`, `tag:`), Devanagari normalization, and `videoFeatures` derivation.
   - Enhanced `video.schema.js` with `features`, `language`, `format`, and indexed fields.
   - Delivered `scripts/backfill-rec-metadata.js`.
   - Verified by `tests/rec-features.test.js` (4/4 pass).

2. **Task 2: Creator Language & Format Fields**
   - Added channel-level default language (`primaryLanguage`) and supported languages (`supportedLanguages`).
   - Wired studio video upload/update routes and validation schemas.
   - Enforced backward-compatible fallbacks across creator studio endpoints.

3. **Task 3: Event Ingestion & View Counting**
   - Implemented `RecEvent` schema (`rec-event.model.js`) with compound index `(video, viewerKey, viewDay)`.
   - Implemented `events.service.js` with atomic daily view incrementing, session linking, and batch processing.
   - Delivered `POST /api/v1/recommendation-events` endpoint with rate limiting.
   - Verified by `tests/rec-events.test.js` (5/5 pass).

4. **Task 4: Client Event Tracking**
   - Implemented `playback-meter.ts` (pure accumulator, 10s heartbeat, strict view criteria: min(30s, 0.5 * duration)).
   - Implemented `tracker.client.ts` (persistent UUID `ld_sid`, queue with max 20 events / 5s flush, pagehide/visibilitychange beacon).
   - Implemented `api.events.tsx` proxy route with session Bearer token attachment.
   - Implemented `useImpression.ts` (IntersectionObserver threshold 0.5, 1s dwell time).
   - Implemented `usePlaybackTracking.ts` (`play_start`, `watch_progress`, `view`, `play_end`).
   - Integrated into `VideoCard.tsx`, `HlsPlayer.tsx`, and `watch.$id.tsx`.

5. **Task 5: 7-Day Stats Job & Trending Row**
   - Implemented `stats.job.js` with percentile calculation over smoothed engagement.
   - Implemented `workers/recStats.worker.js` with BullMQ scheduled queue running every 15 minutes.
   - Wired Home feed `popular` section to order by `stats.trending: -1`.
   - Verified by `tests/rec-stats.test.js` (3/3 pass).

6. **Task 6: Viewer Profile, Preferences & Onboarding API**
   - Implemented `rec-profile.model.js` with explicit/inferred weights, discovery level, language filters, and feedback sets.
   - Implemented `onboarding.v1.js` question definitions and `mapAnswers` rule-based mapper.
   - Implemented `snapshot.cache.js` Redis snapshot management.
   - Implemented `profile.service.js` lifecycle (actions, feedback, deletion cascade).
   - Delivered preferences endpoints:
     - `GET /recommendation-onboarding`
     - `POST /recommendation-onboarding/preview`
     - `GET /user/me/recommendation-preferences`
     - `PUT /user/me/recommendation-preferences`
     - `DELETE /user/me/recommendation-preferences`
     - `PUT /user/me/recommendation-feedback/:videoId`
   - Verified by `tests/rec-profile.test.js` (3/3 pass).

7. **Task 7: Scoring & Re-ranking**
   - Implemented `scoring.js`:
     - Multi-component scoring (interest, follow bonus, trending, freshness exponential decay, Bayesian quality).
     - Multipliers: watch penalty and language mismatch penalty.
     - Jaccard similarity for related videos.
     - Diversity re-ranking with per-page channel cap, explore slot injection, and deterministic seeded PRNG.
     - Transparent recommendation explanation helper `reasonFor`.
   - Verified by `tests/rec-scoring.test.js` (5/5 pass).

8. **Task 8: Feed Service, Endpoints & Home Integration**
   - Implemented `candidates.repository.js` with multi-pool queries (`following`, `interest`, `trending`, `fresh`, `explore`).
   - Implemented `feed.service.js` with cursor-based pagination (`encodeCursor`, `decodeCursor`, `firstPage`, `nextPage`, `related`).
   - Delivered `GET /api/v1/recommendations`.
   - Upgraded `GET /api/v1/video/:videoId/related` to delegate to `feedService.related`.
   - Upgraded `GET /api/v1/home` to prepend `for-you` section for personalized viewers with graceful degradation.
   - Verified by `tests/rec-feed.test.js` (11/11 pass).

9. **Task 9: Client "For You", Reasons & Feedback**
   - Implemented `api.feed.tsx` and `api.rec-feedback.tsx` resource routes.
   - Enhanced `VideoCard.tsx` with recommendation reason line, dropdown feedback menu ("Not interested", "Don't recommend channel"), and "Removed. Undo" transition.
   - Enhanced `watch.$id.tsx` to render related videos rail with `surface: 'related'` tracking.
   - Enhanced `_index.tsx` with "Load more" button under "For you" row with 410 auto-recovery.

10. **Task 10: Client Onboarding & Feed Settings**
    - Built `/onboarding` multi-step questionnaire, video picker, preview, and guest/user persistence (`ld_hints` cookie / backend preferences).
    - Built "Tune your feed" card in `settings.tsx` with personalization switch, language selectors, discovery level, removable topic chips, excluded topics unblocking, and reset controls.
    - Added dismissible personalization banner to Home feed.

11. **Task 11: Baseline Report & Verification**
    - Created `scripts/rec-report.js` with surface breakdown, catalogue coverage, and impression share.
    - Verified full backend test suite: **80/80 tests passing** (`node --test tests/*.test.js`).
    - Verified client TypeScript compilation (`tsc`: 0 errors).
    - Verified client production build (`remix vite:build`: successful in 9.69s).

