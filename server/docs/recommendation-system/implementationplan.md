# LokDarpan Recommendation System v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** plan only, written 13 November 2026. Nothing in this file is implemented.

**Goal:** Replace the lifetime-view Home feed with an event-driven, explainable, personalized feed (Home "For you" and Watch "related") that works on a small catalogue.

**Architecture:** Every video gets a derived list of *feature keys* (`cat:`, `fmt:`, `len:`, `lang:`, `tag:`). A viewer's profile is a set of weighted feature keys: explicit choices (onboarding, Tune your feed) combined with interests inferred on read from that viewer's last 30 days of events. A feed is built from bounded candidate pools, one transparent score, a re-rank with channel caps and exploration slots, and a Redis snapshot for stable pagination. A BullMQ job computes 7-day per-video stats from an events collection that expires after 90 days.

**Tech Stack:** Node ESM, Fastify 4, Mongoose 8 / MongoDB, BullMQ 5 + ioredis (both already installed), `node:test`. Client: Remix + React + shadcn/ui. One new dependency: `@fastify/rate-limit` (the major that supports Fastify 4; v9 at the time of writing, verify before installing).

**Spec:** `server/docs/recommendation-system/plan.md` (product plan). This file is the technical plan for its phases 1–3. Read both.

---

## Starting state (read from source, not run)

- `Video` has no language, format or publish date, and defines no indexes.
- Nothing in `server/src` or `server/workers` increments `Video.views` or writes `viewedBy`. The "Popular videos" row sorts on a counter that no code updates.
- Home (`modules/home/home.service.js`) returns three sections (`popular`, `shorts`, `latest`) with no viewer context. Its route has no auth hook.
- Related (`modules/catalogue/catalogue.routes.js`) is "same category, minus the seed".
- `WatchHistory {user, video, positionSeconds}` and `SavedVideo` exist. Likes are `likedBy` arrays on `Video` with no timestamps. Subscriptions are `User.subscribedChannels`.
- BullMQ queues exist for transcoding (`shared/messaging/transcodeQueues.js`). Redis comes from `createRedisConnection()`.
- Reusable exports: `publicFilter`, `videoCard`, `readableVideo`, `populateAuthor` (`catalogue.service.js`); `categories` (`home.service.js`); `optionalAuthenticate` (`middleware/auth.middleware.js`); error classes in `utils/errors.js`.
- Server tests run with `node --test tests/*.test.js` and test services through injected fakes (see `tests/home.test.js`). The client has no test runner.
- The client has two Watch routes (`watch.$id.tsx`, `watch.$videoId.tsx`). Search and the Shorts feed have no working backend-to-UI path.

## Prerequisites (not tasks in this plan)

1. One authoritative Watch route. Task 4's playback tracking attaches to it. Raj decides which of the two survives.
2. A local MongoDB and Redis for Task 11. Unit tests need neither.

## Decisions made here (Raj to confirm)

These are defaults for the spec's open questions. Each is one config value or one small code path, so changing one later is cheap.

| # | Decision | Spec question |
| --- | --- | --- |
| 1 | Personalization is off until the viewer turns it on (onboarding intro or Settings). While it is off, events are stored without the account ID. Turning it off unlinks that viewer's stored events. | 11, 15 |
| 2 | Guests get the non-personalized feed. Their onboarding result is kept in a first-party browser cookie that the Remix loader forwards as stateless `hints`. The database never stores it. | 5 |
| 3 | Search affects Home only through videos the viewer actually watched from search results (signal ×1.5). Query text is never stored in recommendation data. | 15, 16 |
| 4 | Raw events expire after 90 days. Inferred interests use the last 30 days. | 11, 16 |
| 5 | Initial languages: `hi`, `mr`, `en`, plus `und` for unknown. Location is not used. | 3 |
| 6 | Creators choose category, language and format. Nobody verifies them in v0. | 7 |
| 7 | One feedback endpoint. `not_interested` affects one video; `hide_channel` affects one creator. A dislike only feeds the quality term. | 9 |
| 8 | A view is 30 s of active playback or half the video, whichever is shorter, once per viewer (or session) per video per UTC day. An impression is a card at least 50% visible for 1 s. | 10 |
| 9 | Networks are not used. The Shorts feed is a separate later plan. | 2, 6 |
| 10 | Exploration takes 2 of every 12 slots by default (1 or 3 by viewer choice). | 13 |

## Global Constraints

- All paths are under `/api/v1`. Changes are additive: no existing response field is removed or renamed.
- Eligibility is always `publicFilter` from `catalogue.service.js`, applied when candidates are fetched and again when a page is served. No score overrides it.
- Identity comes only from the JWT. A user ID in a request body is never trusted.
- Never return or log passwords, storage keys, job internals or another person's data. No Aadhaar/DigiLocker or network data in features or events.
- No fabricated content. Thin pools return fewer items, never padding or duplicates.
- Every tunable lives in `rec.config.js`. No recommendation number appears anywhere else.
- Unit tests use `node:test` with injected fakes and need no live database.
- The client gets no new test runner. Client tasks are verified by `npx tsc --noEmit`, `npx vite build` and the listed browser checks.
- A task is complete only when its UI is integrated and checked (project rule in `docs/api-progress.md`).
- Commits are authored by Raj only: no co-author or tool-attribution trailers.

## Review Focus

Each line has a test in the task named in brackets.

1. **Catalogue smaller than one page, or empty pools.** The feed returns fewer items with no duplicates and no error. [Tasks 7, 8]
2. **Replayed, duplicated or badly-timed events.** A repeated `eventId`, a second view of the same video the same day, or a `clientTs` a day off never double-counts. [Task 3]
3. **A video made private or deleted while it sits in a snapshot.** It is never served on a later page. [Task 8]
4. **Devanagari tags and missing metadata.** Keys are still derived, combining marks survive, and unknown language or duration is not penalized. [Tasks 1, 7]
5. **Redis down, or the stats job has never run.** Home still answers with an honest recent list and never fails because of recommendations. [Tasks 5, 8]

---

## Shared design

### Tunables: `server/src/modules/recommendation/rec.config.js`

All values are starting hypotheses, to be revisited with data from Task 11.

```js
export const REC = {
  policyVersion: 'v0.1',
  weights: { interest: 0.40, follow: 0.20, trending: 0.20, fresh: 0.15, quality: 0.05 },
  relatedWeights: { similarity: 0.50, sameChannel: 0.20, trending: 0.15, interest: 0.15 },
  freshTauDays: 14,
  inference: { windowDays: 30, decayTauDays: 14, cap: 0.6, maxEvents: 300, maxKeys: 30 },
  signal: { view: 0.10, play_end: 0.15, like: 0.25, save: 0.25, searchMultiplier: 1.5 },
  explicitWeight: { onboarding: 0.3, tune: 0.5, hint: 0.3, onboardingCap: 0.5 },
  pools: { interest: 200, following: 100, trending: 100, fresh: 100, explore: 50, interestKeys: 20, followingDays: 30 },
  pageSize: 12, maxLimit: 24, snapshotSize: 200, snapshotTtlSeconds: 1800, profileCacheSeconds: 300,
  channelCapPerPage: 2, relatedChannelCap: 3,
  explore: { slots: { low: 1, balanced: 2, high: 3 }, positions: [3, 8, 10], maxImpressions7d: 50, maxAgeDays: 14 },
  watched: { fraction: 0.8, penalty: 0.25, historyRows: 500 },
  languageMismatchPenalty: 0.5,
  stats: { windowDays: 7, everyMs: 900000, ctrPrior: { plays: 2, impressions: 20 }, watchPrior: { fraction: 0.3, plays: 5 } },
  events: { maxBatch: 50, maxHeartbeatSeconds: 15, ttlDays: 90, maxSkewMs: 300000, maxAgeMs: 86400000, ratePerMinute: 60 },
  view: { seconds: 30, fraction: 0.5 },
  impression: { visibleRatio: 0.5, dwellMs: 1000 },
  limits: { explicitKeys: 30, excludedKeys: 30, notInterested: 500, hints: 15, pickedVideos: 10 },
  languages: ['hi', 'mr', 'en'],
  formats: ['explainer', 'story', 'discussion', 'tutorial', 'performance', 'update', 'other'],
};
```

### Feature keys

`videoFeatures(video)` returns a sorted, de-duplicated `string[]`:

| Key | Rule |
| --- | --- |
| `cat:<slug>` | `category` matched case-insensitively against the ten labels in `home.service.js`. No match or missing: `cat:other`. Always present. |
| `fmt:<format>` | Only when `format` is set and is not `other`. |
| `lang:<code>` | Only when `language` is set and is not `und`. |
| `len:short\|medium\|long` | `type === 'short'` or duration < 300 s: `short`. Duration < 1200 s: `medium`. Otherwise `long`. No duration and not a short: omitted. |
| `tag:<slug>` | First 10 tags. Slug: NFC-normalize, lowercase, trim, whitespace runs to `-`, keep only `\p{L}\p{M}\p{N}-`, cut to 40 characters, drop empties. `\p{M}` must stay or Devanagari vowel signs are stripped. |

Valid key grammar: `/^(cat|fmt|len|lang|tag):[\p{L}\p{M}\p{N}-]{1,40}$/u`.

`keyLabel(key)`: `cat:` gives the category label; `fmt:` gives Explainers, Stories, Discussions, How-to videos, Performances, Quick updates; `len:` gives Shorter videos, Mid-length videos, Longer videos; `lang:` gives Hindi, Marathi, English; `tag:x` gives `#x`.

### Data model

**`Video` (modify `modules/video/schemas/video.schema.js`).** Add:

| Field | Type | Notes |
| --- | --- | --- |
| `language` | String, enum `[...REC.languages, 'und']`, default `'und'` | Creator-set. |
| `format` | String, enum `REC.formats`, default `'other'` | Creator-set. |
| `publishedAt` | Date | Set once, the first time the video is `COMPLETED` and public. |
| `features` | [String] | Derived by `videoFeatures`. Never accepted from a client. |
| `stats` | `{ impressions7d, plays7d, views7d, watchSeconds7d, trending }` Numbers default 0, plus `updatedAt` Date | Written only by the stats job. `trending` is 0–1. |

Indexes: `{ status: 1, type: 1, publishedAt: -1 }`, `{ features: 1, publishedAt: -1 }`, `{ 'stats.trending': -1, _id: -1 }`, `{ user_id: 1, publishedAt: -1 }`.

**`RecEvent` (`rec-event.model.js`).** `timestamps: { createdAt: true, updatedAt: false }`.

| Field | Type | Notes |
| --- | --- | --- |
| `eventId` | String, unique | Client UUID. Makes retries idempotent. |
| `type` | enum `impression, click, play_start, watch_progress, play_end, view, like, save, not_interested` | The last three are written by the server only. |
| `user` | ObjectId or null | Set only when the request is authenticated and that viewer has personalization on. |
| `sessionId` | String (UUID), required | Client-generated. |
| `video` | ObjectId, required | |
| `surface` | enum `home, related, search, channel, shorts, other` | |
| `requestId` | String, max 64 | From the feed response. |
| `position` | Integer 0–199 | |
| `source` | enum `interest, following, trending, fresh, explore, related, none` | |
| `watchSeconds` | Number 0–15 | `watch_progress` only: active seconds since the previous heartbeat. |
| `positionSeconds` | Number ≥ 0 | |
| `dedupeKey` | String | `view` only: `view:<userId or sessionId>:<videoId>:<YYYY-MM-DD UTC>`. Absent (not null) on other types. |
| `policy` | String | Stamped by the server with `REC.policyVersion`. |
| `clientTs` | Date | |

Indexes: `eventId` unique; `dedupeKey` unique + sparse; `{ createdAt: 1 }` with `expireAfterSeconds` = 90 days; `{ video: 1, type: 1, createdAt: -1 }`; `{ user: 1, createdAt: -1 }` partial on `user` of type objectId.

**`RecProfile` (`rec-profile.model.js`).** One per user (`user` unique).

```
personalizationEnabled: Boolean (default false)
languages: [String]                      // subset of REC.languages
discovery: 'low' | 'balanced' | 'high'   // default 'balanced'
onboarding: { version, completedAt, skippedAt, answers: [{ questionId, optionIds: [String] }] }
explicit:  [{ key, weight, source: 'onboarding' | 'tune', updatedAt }]
excluded:  [{ key, updatedAt }]
hiddenCreators: [ObjectId]               // video owner user IDs
notInterested:  [{ video, createdAt }]   // newest 500 kept
schemaVersion: 1
```

### Scoring

For viewer `u` and video `v`, every component is in [0, 1]:

```
w_u(k)        = 1 − (1 − explicit_u(k)) · (1 − inferred_u(k))
interest(u,v) = 1 − ∏ over k in features(v) of (1 − w_u(k))
follow(u,v)   = 1 if v.user_id is the owner of a channel u subscribes to, else 0
trending(v)   = v.stats.trending
fresh(v)      = exp(−ageDays(v.publishedAt) / 14)
quality(v)    = (likes + 1) / (likes + dislikes + 2)

score = 0.40·interest + 0.20·follow + 0.20·trending + 0.15·fresh + 0.05·quality
score × 0.25  if the viewer's history position ≥ 0.8 · durationSeconds
score × 0.5   if the viewer set languages and v.language is in neither that list nor 'und'
```

Hard exclusions, applied before scoring: the video is in `notInterested`; its owner is in `hiddenCreators`; any of its keys is in `excluded`; the viewer owns it.

Inferred interest, computed on read from the viewer's newest 300 events of type `view`, `play_end`, `like`, `save` in the last 30 days:

```
s_e         = signal[e.type] · (1.5 if e.surface === 'search' else 1) · exp(−ageDays(e) / 14)
inferred(k) = min(0.6, 1 − ∏ over events e whose video has key k of (1 − s_e))     // keep the top 30 keys
```

Related score for seed `s`: `0.50·jaccard(features(s), features(v)) + 0.20·sameOwner + 0.15·trending(v) + 0.15·interest(u,v)`.

Stats job, per eligible video over the last 7 days:

```
ctr         = (plays + 2) / (impressions + 20)
rawFraction = min(1, watchSeconds / (max(plays, 1) · durationSeconds))      // 0 when duration is missing
wf          = (plays · rawFraction + 0.3 · 5) / (plays + 5)
trendRaw    = ln(1 + plays) · ctr · wf
trending    = percentile rank of trendRaw among videos with plays > 0  →  (ascending index + 1) / n
              0 for videos with no plays
```

### Feed build

1. **Viewer context.** Load `ViewerContext` (Task 6). Guests with no hints get an empty one.
2. **Pools.** Each query is ANDed with `publicFilter`, `type ≠ 'short'` and, when a category is requested, `features: 'cat:<slug>'`.

   | Pool | Extra filter | Sort | Limit |
   | --- | --- | --- | --- |
   | `following` | `user_id` in subscribed owners, `publishedAt` within 30 days | `publishedAt` desc | 100 |
   | `interest` | `features` in the viewer's top 20 keys by weight | `publishedAt` desc | 200 |
   | `trending` | `stats.trending > 0` | `stats.trending` desc | 100 |
   | `fresh` | none | `publishedAt` desc | 100 |
   | `explore` | `publishedAt` within 14 days, `stats.impressions7d < 50` | `publishedAt` desc | 50 |

   `following` and `interest` are skipped when their input is empty. A video in several pools keeps the first source in the order `following`, `interest`, `trending`, `fresh`.
3. **Score** the union, drop exclusions, sort by score descending then `_id` descending.
4. **Re-rank** into pages of 12. Positions 3 and 8 (0-based; position 10 too for `high`, only 3 for `low`) take a random unused video from the explore pool, using a PRNG seeded with the snapshot ID. An empty explore pool leaves no gap. Within one page a creator appears at most twice; extra videos move to the next page. Log `{ requestId, explore: [{ id, propensity: slots / poolSize }] }`.
5. **Snapshot.** Store the first 200 `{ id, source, topKey }` in Redis at `rec:snap:<snapshotId>` for 30 minutes. `requestId` equals `snapshotId`. The cursor is `base64url("<snapshotId>:<offset>")`.
6. **Serve.** Slice the snapshot, refetch those IDs with `publicFilter`, keep snapshot order, drop anything no longer eligible, map with `videoCard` and add `rec`.

Failure behaviour: Redis unavailable gives the first page only with `hasMore: false`. An unknown or expired snapshot gives `410 { error: { code: 'FEED_EXPIRED' } }` and the client reloads the first page. A database error gives `503 { error: { code: 'FEED_UNAVAILABLE' } }`. On Home, a failed "For you" build is logged and that section is omitted; the rest of Home still returns.

Reason attached to each item: `{ type, label }`. `following` source gives `following`; `trending`, `fresh`, `explore` give themselves; `interest` gives `explicit` when the top matching key's explicit weight is at least its inferred weight, otherwise `inferred`, with `label = keyLabel(topKey)`. Client copy: "Because you chose {label}", "Because you watched {label}", "From a channel you follow", "Trending", "New", "Something different".

### API contracts

| Method + path | Auth | Request | Response |
| --- | --- | --- | --- |
| `GET /home` | optional | existing query, plus `hints` and `languages` (used for guests only) | existing shape plus `requestId`. When personalized, a first section `{ id: 'for-you', title: 'For you', type: 'video', items, nextCursor }`. `featured` still comes from the `popular` section. |
| `GET /recommendations` | optional | `cursor`, `limit` 1–24 (default 12), `category`, `hints`, `languages` | `{ requestId, items, nextCursor, hasMore, personalized }` |
| `GET /video/:videoId/related` | optional (exists) | `limit` 1–24 | existing fields (`items`, `videos` alias, `hasMore: false`, `nextCursor: null`) plus `requestId` |
| `POST /recommendation-events` | optional | `{ sessionId, events: [1..50] }` | `202 { accepted }` |
| `GET /recommendation-onboarding` | none | none | `{ version, intro, questions: [{ id, text, multi, options: [{ id, label }] }] }` |
| `POST /recommendation-onboarding/preview` | none | `{ answers, pickedVideoIds }` | `{ keys: [{ key, label, weight }], languages, discovery }` |
| `GET /user/me/recommendation-preferences` | required | none | `PreferencesView` |
| `PUT /user/me/recommendation-preferences` | required | any of `personalizationEnabled`, `languages`, `discovery`, `explicitKeys`, `excludedKeys`, `onboarding: { answers, pickedVideoIds, skipped }` | `PreferencesView` |
| `DELETE /user/me/recommendation-preferences?scope=` | required | `scope` = `explicit`, `inferred` or `all` | `{ message }` |
| `PUT /user/me/recommendation-feedback/:videoId` | required | `{ action: 'not_interested' \| 'hide_channel', active: boolean }` | `{ action, active }` |

Feed items are `videoCard` output plus `rec: { source, reason: { type, label } }`. `hints` is a comma-separated list of at most 15 valid keys, each applied at weight 0.3. All bodies use Fastify JSON schemas with `additionalProperties: false`.

`PreferencesView`: `{ personalizationEnabled, languages, discovery, explicit: [{ key, label, source }], excluded: [{ key, label }], inferred: [{ key, label }] (top 10), onboarding: { version, completed }, hiddenChannelCount, notInterestedCount }`.

### Onboarding content: `onboarding.v1.js`

Intro copy (from the spec, verbatim): "A few quick questions can help us make your feed feel more like you. You can skip any question and change your choices anytime."

Question wording is the spec's draft. Every question allows multiple answers and can be skipped.

| Question ID and text | Option ID → label | Mapping |
| --- | --- | --- |
| `after_long_day`: "You have a little time after a long day. What sounds nice?" | `laugh` → A good laugh | `cat:comedy` 0.3 |
| | `story` → A story | `fmt:story` 0.3 |
| | `calming` → Something calming | `cat:music` 0.2, `tag:calm` 0.2 |
| | `new` → Trying something new | `discovery: 'high'`, no keys |
| | `depends` → It depends | nothing |
| `free_afternoon`: "It's a free afternoon. What might you enjoy doing?" | `music` → Listening to music | `cat:music` 0.3 |
| | `match` → Following a match | `cat:sports` 0.3 |
| | `making` → Making or fixing something | `fmt:tutorial` 0.3 |
| | `local` → Hearing local stories | `tag:local` 0.3, `fmt:story` 0.15 |
| | `else` → Something else | nothing |
| `follow_conversation`: "A conversation gets interesting. How do you like to follow it?" | `overview` → A quick overview | `len:short` 0.2, `fmt:update` 0.2 |
| | `views` → Different people's views | `fmt:discussion` 0.3 |
| | `detailed` → A detailed explanation | `fmt:explainer` 0.3, `len:long` 0.15 |
| | `depends` → Depends on the topic | nothing |
| `languages`: "Which languages do you want videos in?" | `hi`, `mr`, `en` | sets `languages`, no keys |

After the questions, the viewer may pick up to 10 real videos. Each pick adds that video's `cat:` and `fmt:` keys at 0.3. When one key arrives from several answers, combine with `1 − ∏(1 − w)` and cap at 0.5.

### File structure

```
server/src/modules/recommendation/
  rec.config.js              tunables (above)
  features.js                videoFeatures, isValidKey, keyLabel, needsPublishedAt
  rec-event.model.js         RecEvent
  rec-profile.model.js       RecProfile
  events.service.js          batch ingestion, server-side recordAction
  onboarding.v1.js           questions, mapping, mapAnswers
  scoring.js                 pure: inferWeights, interestScore, scoreVideo, isExcluded, jaccard, relatedScore, rerank, reasonFor
  profile.service.js         preferences CRUD, feedback, loadViewerContext
  snapshot.cache.js          Redis snapshot + profile cache, failure-tolerant
  candidates.repository.js   Mongo pool queries
  feed.service.js            firstPage, nextPage, related
  stats.job.js               computeVideoStats (pure), runStatsJob
  recommendation.routes.js   every route in the table except /home and related
server/workers/recStats.worker.js
server/scripts/backfill-rec-metadata.js
server/scripts/rec-report.js
server/tests/rec-*.test.js   one file per server task

client/app/lib/tracker.client.ts          event queue, batching, session ID
client/app/lib/playback-meter.ts          pure watch-time accumulator
client/app/hooks/useImpression.ts
client/app/hooks/usePlaybackTracking.ts
client/app/routes/api.events.tsx          resource route: forwards events with the session token
client/app/routes/api.feed.tsx            resource route: next feed page
client/app/routes/api.rec-feedback.tsx    resource route: not interested / hide channel
client/app/routes/onboarding.tsx
```

Modified: `video.schema.js`, `video.service.js`, the video body schemas, `transcodeResult.listener.js`, `home.service.js`, `home.repository.js`, `home.routes.js`, `catalogue.service.js`, `catalogue.routes.js`, `library.service.js`, the account-deletion service, `app.js`, `server/package.json`; client `lib/api.ts`, `services/home.server.ts`, `routes/_index.tsx`, `routes/settings.tsx`, `routes/upload.tsx`, `routes/studio._index.tsx`, the Watch route, `VideoCard.tsx`, `HlsPlayer.tsx`.

---

## Tasks

Run server commands from `server/`, client commands from `client/`.

### Task 1: Feature keys and video metadata (server)

**Files:**
- Create: `src/modules/recommendation/rec.config.js`, `src/modules/recommendation/features.js`, `scripts/backfill-rec-metadata.js`
- Modify: `src/modules/video/schemas/video.schema.js`, `src/modules/video/services/video.service.js` (`createVideo`, `initiateVideoUpload`, `updateVideo`), the video create/update body schemas, `src/modules/video/listeners/transcodeResult.listener.js`
- Test: `tests/rec-features.test.js`

**Interfaces:**
- Produces: `REC`; `videoFeatures(video) → string[]`; `isValidKey(key) → boolean`; `keyLabel(key) → string`; `needsPublishedAt({ status, visibility, publishedAt }) → boolean`; the new `Video` fields and indexes.

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { videoFeatures, isValidKey, needsPublishedAt } from '../src/modules/recommendation/features.js';

test('videoFeatures derives sorted, deduped keys and keeps Devanagari marks', () => {
  assert.deepEqual(
    videoFeatures({ category: 'COMEDY', format: 'story', language: 'hi', durationSeconds: 240, tags: ['Stand Up', 'stand up', 'हास्य!'] }),
    ['cat:comedy', 'fmt:story', 'lang:hi', 'len:short', 'tag:stand-up', 'tag:हास्य']);
});

test('videoFeatures handles missing and unknown metadata', () => {
  assert.deepEqual(videoFeatures({}), ['cat:other']);
  assert.deepEqual(videoFeatures({ category: 'Knitting', type: 'short', durationSeconds: 5000, format: 'other', language: 'und' }), ['cat:other', 'len:short']);
  assert.ok(videoFeatures({ durationSeconds: 300 }).includes('len:medium'));
  assert.ok(videoFeatures({ durationSeconds: 1200 }).includes('len:long'));
  assert.equal(videoFeatures({ tags: Array.from({ length: 14 }, (_, i) => `t${i}`) }).filter(k => k.startsWith('tag:')).length, 10);
});

test('key grammar and publish rule', () => {
  assert.equal(isValidKey('tag:हास्य'), true);
  assert.equal(isValidKey('user:123'), false);
  assert.equal(isValidKey('tag:' + 'a'.repeat(41)), false);
  assert.equal(needsPublishedAt({ status: 'COMPLETED', visibility: 'public' }), true);
  assert.equal(needsPublishedAt({ status: 'COMPLETED' }), true);            // legacy: missing visibility is public
  assert.equal(needsPublishedAt({ status: 'COMPLETED', visibility: 'private' }), false);
  assert.equal(needsPublishedAt({ status: 'PROCESSING', visibility: 'public' }), false);
  assert.equal(needsPublishedAt({ status: 'COMPLETED', visibility: 'public', publishedAt: new Date() }), false);
});
```

- [ ] **Step 2: Run `node --test tests/rec-features.test.js`.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement `rec.config.js` and `features.js`** to the rules in "Tunables" and "Feature keys".
- [ ] **Step 4: Extend the schema** with the fields and four indexes in "Data model". Accept `language` and `format` in the create and update body schemas (enums from `REC`). Reject `features`, `stats` and `publishedAt` from clients.
- [ ] **Step 5: Keep derived fields current.** Recompute `features` in `createVideo`, `initiateVideoUpload` and `updateVideo`. Set `publishedAt = now` where `needsPublishedAt` becomes true: the success path of `applyTranscodeResult` and a visibility change in `updateVideo`. `findByIdAndUpdate` skips save hooks, so do this explicitly in those paths.
- [ ] **Step 6: Write `scripts/backfill-rec-metadata.js`.** It accepts `--dry-run`, creates the indexes, then walks all videos in batches of 500 setting `features` and, where `needsPublishedAt`, `publishedAt = createdAt`. It prints the counts and is safe to re-run.
- [ ] **Step 7: Run `npm test`.** Expected: all pass, including the 22 existing tests.
- [ ] **Step 8: Commit** `feat(rec): feature keys and video metadata`.

### Task 2: Language and format in the creator UI (client)

**Files:**
- Modify: `app/routes/upload.tsx`, `app/routes/studio._index.tsx`, `app/lib/api.ts` (`initiateUpload` body, `VideoUpdate`, `StudioVideo`)

**Interfaces:**
- Consumes: Task 1's `language` and `format` body fields.

- [ ] **Step 1: Add two selects** to the upload form and the studio edit dialog: Language (Hindi `hi`, Marathi `mr`, English `en`, "Not sure" `und`) and Format (the six `keyLabel` names plus "Other"). Use the shadcn `Select` already in `components/ui`.
- [ ] **Step 2: Send both fields** in `initiateUpload` and `updateVideo`.
- [ ] **Step 3: Verify.** `npx tsc --noEmit` and `npx vite build` pass. In the browser, edit a video's language and confirm it is still set after a reload.
- [ ] **Step 4: Commit** `feat(rec): creator language and format fields`.

### Task 3: Event ingestion and view counting (server)

**Files:**
- Create: `src/modules/recommendation/rec-event.model.js`, `src/modules/recommendation/events.service.js`, `src/modules/recommendation/recommendation.routes.js`
- Modify: `src/app.js` (register the routes and `@fastify/rate-limit` with `global: false`), `package.json`
- Test: `tests/rec-events.test.js`

**Interfaces:**
- Consumes: `REC.events`.
- Produces: `createEventsService({ insertEvents, findPublicVideoIds, incViews, isPersonalized, now }) → { ingest, recordAction }`
  - `ingest({ viewerId, sessionId, events }) → Promise<{ accepted: number }>`
  - `recordAction({ userId, type: 'like' | 'save' | 'not_interested', videoId, surface? }) → Promise<void>`. It never throws; failures are logged.
  - `insertEvents(docs) → Promise<insertedDocs>` inserts unordered and returns only the documents that were stored, swallowing duplicate-key errors.

- [ ] **Step 1: Write the failing tests.** Use a fixed `now = new Date('2026-11-13T10:00:00Z')`, a `findPublicVideoIds` fake that knows only video `V1`, and an `insertEvents` fake that returns what it is given unless told to drop an ID.

```js
test('ingest validates, clamps and never trusts identity', async () => {
  const { accepted } = await svc.ingest({ viewerId: 'U1', sessionId: SID, events: [
    ev({ type: 'impression', video: V1 }),
    ev({ type: 'watch_progress', video: V1, watchSeconds: 400 }),
    ev({ type: 'click', video: V1, clientTs: '2026-11-12T08:00:00Z' }),   // 26 h old: dropped
    ev({ type: 'click', video: UNKNOWN }),                                 // not public: dropped
  ] });
  assert.equal(accepted, 2);
  assert.equal(stored[1].watchSeconds, 15);
  assert.equal(stored[0].user, null);            // isPersonalized('U1') resolved false
  assert.equal(stored[0].policy, 'v0.1');
});

test('a view is counted once per viewer, video and UTC day', async () => {
  await svc.ingest({ viewerId: null, sessionId: SID, events: [ev({ type: 'view', video: V1 })] });
  assert.equal(stored.at(-1).dedupeKey, `view:${SID}:${V1}:2026-11-13`);
  assert.equal(viewIncrements, 1);
  dropNextInsert();                              // simulates the duplicate-key path
  await svc.ingest({ viewerId: null, sessionId: SID, events: [ev({ type: 'view', video: V1 })] });
  assert.equal(viewIncrements, 1);
});

test('personalized viewers are linked and keyed by account', async () => {
  personalized.add('U1');
  await svc.ingest({ viewerId: 'U1', sessionId: SID, events: [ev({ type: 'view', video: V1 })] });
  assert.equal(String(stored.at(-1).user), 'U1');
  assert.ok(stored.at(-1).dedupeKey.startsWith('view:U1:'));
});

test('oversize batches are rejected', async () => {
  await assert.rejects(svc.ingest({ viewerId: null, sessionId: SID, events: Array.from({ length: 51 }, () => ev({ type: 'click', video: V1 })) }), /at most 50/);
});
```

  Add HTTP tests with `app.inject`: a body without `sessionId` gives 400; a body carrying `user` gives 400; an event of type `like` gives 400; a valid batch gives 202.

- [ ] **Step 2: Run `node --test tests/rec-events.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement the model** exactly as in "Data model", including the TTL, sparse and partial indexes.
- [ ] **Step 4: Implement `events.service.js`.** Drop, without failing the batch, any event whose `clientTs` is more than 24 h old or more than 5 min ahead, or whose video is not public. Clamp `watchSeconds` to [0, 15]. Call `incViews(videoId)` once for each `view` document that `insertEvents` reports stored.
- [ ] **Step 5: Add `POST /recommendation-events`** with `optionalAuthenticate`, the JSON schema (client event types only), and route-level rate limit 60 per minute. Until Task 6 exists, wire `isPersonalized` as `async () => false`, so every event is stored unlinked.
- [ ] **Step 6: Run `npm test`.** Expected: PASS.
- [ ] **Step 7: Commit** `feat(rec): event ingestion and view counting`.

### Task 4: Client tracking

**Files:**
- Create: `app/lib/tracker.client.ts`, `app/lib/playback-meter.ts`, `app/hooks/useImpression.ts`, `app/hooks/usePlaybackTracking.ts`, `app/routes/api.events.tsx`
- Modify: `app/components/VideoCard/VideoCard.tsx`, `app/components/VideoPlayer/HlsPlayer.tsx`, the Watch route

**Interfaces:**
- Consumes: `POST /recommendation-events`.
- Produces:
  - `track(event: { type; video; surface; requestId?; position?; source?; watchSeconds?; positionSeconds? }): void`, `flush(useBeacon?: boolean): void`, `getSessionId(): string`
  - `type Tracking = { requestId: string; position: number; surface: 'home' | 'related' | 'search' | 'channel' | 'other'; source?: string }`
  - `VideoCard` prop `tracking?: Tracking`. Without it the card does no tracking, which keeps the design-sync bundle and previews working.
  - `createPlaybackMeter({ durationSeconds }) → { onTime(currentTime: number, visible: boolean): Array<'heartbeat' | 'view'>; takeDelta(): number }` (pure, no DOM)

- [ ] **Step 1: Write `tracker.client.ts`.** Session ID: `crypto.randomUUID()` stored under `ld_sid` in `localStorage`, held in memory when storage throws. Queue events with a fresh `eventId` and `clientTs`. Flush at 20 events or every 5 s by `fetch('/api/events')`. On `pagehide` and when `visibilitychange` goes to hidden, flush with `navigator.sendBeacon`.
- [ ] **Step 2: Write `api.events.tsx`.** The action reads at most 64 KB of JSON, forwards it to `${getServerApiBaseUrl()}/recommendation-events` with the Bearer token when a session exists, and always answers 204. The token never reaches the browser, and beacons work because the route is same-origin.
- [ ] **Step 3: Write `useImpression(ref, tracking)`.** `IntersectionObserver` at threshold 0.5; after 1000 ms continuously visible, send one `impression` per `requestId:video`.
- [ ] **Step 4: Wire `VideoCard`.** Attach `useImpression`, send `click` on the thumbnail and title links, and pass `state={{ rec: tracking }}` on those links.
- [ ] **Step 5: Write `playback-meter.ts`.** Add the difference between successive `currentTime` values when it is between 0 and 2 s and the tab is visible; larger jumps are seeks and add nothing. Emit `heartbeat` every 10 accumulated seconds, and `view` once when the total reaches `min(30, 0.5 · durationSeconds)`.
- [ ] **Step 6: Write `usePlaybackTracking(videoEl, { video, durationSeconds, rec })`.** Send `play_start` on the first `playing`, `watch_progress` with `takeDelta()` on each heartbeat and on pause or unmount, `view` when the meter says so, and `play_end` on `ended`. `rec` comes from `useLocation().state?.rec`; without it use surface `other`. Expose the `<video>` element from `HlsPlayer` by ref and call the hook in the Watch route.
- [ ] **Step 7: Verify.** `npx tsc --noEmit` and `npx vite build` pass. In the browser with the API running: scroll Home and see one `impression` per card in the `/api/events` payloads; watch 30 s and see one `view`; seek forward and confirm the skipped time is not reported.
- [ ] **Step 8: Commit** `feat(rec): client event tracking`.

### Task 5: Stats job and a real Trending row (server)

**Files:**
- Create: `src/modules/recommendation/stats.job.js`, `workers/recStats.worker.js`
- Modify: `src/modules/home/home.service.js`, `src/modules/home/home.repository.js`, `src/modules/catalogue/catalogue.service.js`, `package.json` (`worker:rec` script; add the worker to `start` and `dev`), `tests/home.test.js`
- Test: `tests/rec-stats.test.js`

**Interfaces:**
- Consumes: `RecEvent`, `Video.stats`, `REC.stats`.
- Produces: `computeVideoStats(rows: [{ video, type, count, watchSeconds }], videos: [{ _id, durationSeconds }]) → Map<string, { impressions7d, plays7d, views7d, watchSeconds7d, trending }>`; `runStatsJob({ aggregateEvents, listEligibleVideos, writeStats, now }) → Promise<{ videos: number }>`.

- [ ] **Step 1: Write the failing test**

```js
test('trending is a percentile of smoothed engagement', () => {
  const stats = computeVideoStats([
    { video: 'a', type: 'impression', count: 100 }, { video: 'a', type: 'play_start', count: 20 },
    { video: 'a', type: 'view', count: 10 },        { video: 'a', type: 'watch_progress', count: 90, watchSeconds: 1200 },
    { video: 'b', type: 'impression', count: 10 },  { video: 'b', type: 'play_start', count: 1 },
    { video: 'b', type: 'watch_progress', count: 6, watchSeconds: 60 },
  ], [{ _id: 'a', durationSeconds: 120 }, { _id: 'b', durationSeconds: 60 }, { _id: 'c', durationSeconds: 60 }]);
  assert.equal(stats.get('a').trending, 1);      // trendRaw ≈ 0.2568
  assert.equal(stats.get('b').trending, 0.5);    // trendRaw ≈ 0.0289
  assert.equal(stats.get('c').trending, 0);      // no plays
  assert.equal(stats.get('a').plays7d, 20);
  assert.equal(stats.get('a').views7d, 10);
  assert.equal(stats.get('c').impressions7d, 0); // stale stats are reset, not left behind
});
```

  Also assert a video with no `durationSeconds` does not throw and gets a finite `trending`.

- [ ] **Step 2: Run `node --test tests/rec-stats.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement `computeVideoStats`** from the stats formulas in "Scoring".
- [ ] **Step 4: Implement `runStatsJob`.** `aggregateEvents` groups the last 7 days of `impression`, `play_start`, `view` and `watch_progress` events by `{ video, type }` with counts and summed `watchSeconds`. `writeStats` is one `bulkWrite` covering every eligible video.
- [ ] **Step 5: Add the worker.** Queue `rec-stats`, one job scheduler every 15 minutes (`upsertJobScheduler`), concurrency 1, and one run at startup.
- [ ] **Step 6: Switch the popular sort** in `home.service.js` and in `listVideos` to `{ 'stats.trending': -1, publishedAt: -1, _id: -1 }`. Keep the section ID `popular`, retitle it "Trending now", and report `rankingBasis: 'trending_7d'`. Update `tests/home.test.js` to the new sort. Before any events exist every score is 0, so this row shows the newest videos.
- [ ] **Step 7: Run `npm test`.** Expected: PASS.
- [ ] **Step 8: Commit** `feat(rec): 7-day stats job and trending row`.

### Task 6: Profile, preferences and onboarding API (server)

**Files:**
- Create: `src/modules/recommendation/rec-profile.model.js`, `src/modules/recommendation/onboarding.v1.js`, `src/modules/recommendation/profile.service.js`, `src/modules/recommendation/snapshot.cache.js`, `src/modules/recommendation/scoring.js` (only `inferWeights` in this task)
- Modify: `recommendation.routes.js`, `src/modules/video/services/video.service.js` (`toggleLike` calls `recordAction` when a like is added), `src/modules/library/library.service.js` (saving calls `recordAction`), the account-deletion service (find the string `Account deleted successfully`), `src/app.js`
- Test: `tests/rec-profile.test.js`

**Interfaces:**
- Consumes: `REC`, `isValidKey`, `keyLabel`, `recordAction`, `RecEvent`.
- Produces:
  - `mapAnswers({ answers, pickedVideos: [{ features }] }) → { keys: [{ key, weight }], languages: string[], discovery }`. An unknown question or option throws `ValidationError`.
  - `inferWeights(events: [{ type, surface, video, createdAt }], featuresByVideo: Map<string, string[]>, now: Date) → Map<string, number>`
  - `createRecCache(redis) → { getSnapshot(id), setSnapshot(id, entries), getProfile(userId), setProfile(userId, value), dropProfile(userId) }`. Every method resolves to `null` or does nothing when Redis fails.
  - `createProfileService({ profiles, events, videos, users, cache, now }) → { getPreferences, updatePreferences, resetPreferences, setFeedback, loadViewerContext, isPersonalized, deleteForUser }`
  - `ViewerContext = { viewerId: string | null, personalized: boolean, weights: Map<string, { w, explicit, inferred }>, excluded: Set<string>, hiddenCreators: Set<string>, notInterested: Set<string>, languages: string[], discovery: 'low' | 'balanced' | 'high', subscribedOwners: Set<string>, watched: Map<string, number> }`. `watched` maps video ID to `positionSeconds` from the newest 500 history rows.
  - `loadViewerContext({ viewerId, hints, languages }) → Promise<ViewerContext>`

- [ ] **Step 1: Write the failing tests**

```js
test('mapAnswers turns answers into weak, combined hints', () => {
  const out = mapAnswers({ answers: [
    { questionId: 'after_long_day', optionIds: ['laugh', 'calming'] },
    { questionId: 'free_afternoon', optionIds: ['music'] },
    { questionId: 'languages', optionIds: ['hi', 'mr'] },
  ], pickedVideos: [] });
  const w = Object.fromEntries(out.keys.map(k => [k.key, k.weight]));
  assert.ok(Math.abs(w['cat:comedy'] - 0.3) < 1e-9);
  assert.ok(Math.abs(w['cat:music'] - 0.44) < 1e-9);        // 1 − 0.8 · 0.7
  assert.deepEqual(out.languages, ['hi', 'mr']);
  assert.equal(out.discovery, 'balanced');
  assert.equal(mapAnswers({ answers: [{ questionId: 'after_long_day', optionIds: ['new'] }], pickedVideos: [] }).discovery, 'high');
  assert.throws(() => mapAnswers({ answers: [{ questionId: 'nope', optionIds: [] }], pickedVideos: [] }));
});

test('inferWeights decays, boosts search and caps', () => {
  const now = new Date('2026-11-13T00:00:00Z');
  const f = new Map([['v', ['cat:music']]]);
  const at = days => new Date(now - days * 86400000);
  const one = inferWeights([{ type: 'view', surface: 'home', video: 'v', createdAt: at(0) }], f, now);
  assert.ok(Math.abs(one.get('cat:music') - 0.10) < 1e-9);
  const two = inferWeights([{ type: 'view', surface: 'home', video: 'v', createdAt: at(0) }, { type: 'like', surface: 'home', video: 'v', createdAt: at(14) }], f, now);
  assert.ok(Math.abs(two.get('cat:music') - 0.182773) < 1e-5);
  assert.ok(Math.abs(inferWeights([{ type: 'view', surface: 'search', video: 'v', createdAt: at(0) }], f, now).get('cat:music') - 0.15) < 1e-9);
  assert.equal(inferWeights(Array.from({ length: 20 }, () => ({ type: 'like', surface: 'home', video: 'v', createdAt: at(0) })), f, now).get('cat:music'), 0.6);
  assert.equal(inferWeights([{ type: 'like', surface: 'home', video: 'v', createdAt: at(31) }], f, now).size, 0);
});
```

  Service tests with in-memory fakes:
  - `loadViewerContext` for a viewer with personalization off returns `personalized: false` and empty `weights`.
  - A guest with `hints: ['cat:music', 'bad key']` gets `cat:music` at explicit 0.3 and the invalid key ignored.
  - `updatePreferences` with a key in both `explicitKeys` and `excludedKeys` keeps it only in `excluded`, and calls `cache.dropProfile`.
  - `updatePreferences({ personalizationEnabled: false })` unlinks the viewer's events (`events.updateMany({ user }, { $set: { user: null } })`).
  - `setFeedback(u, video, { action: 'hide_channel', active: true })` stores that video's owner ID; `active: false` removes it.
  - `notInterested` keeps only the newest 500.
  - `resetPreferences(u, 'inferred')` unlinks events and leaves `explicit` untouched; `'explicit'` clears `explicit`, `excluded`, `onboarding`, `languages`, `hiddenCreators` and `notInterested`.
  - `deleteForUser` removes the profile and unlinks events.

- [ ] **Step 2: Run `node --test tests/rec-profile.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement `onboarding.v1.js`** with exactly the IDs, labels and weights in "Onboarding content".
- [ ] **Step 4: Implement `inferWeights`** from the inference formula in "Scoring".
- [ ] **Step 5: Implement `snapshot.cache.js` and `profile.service.js`.** `updatePreferences` validates keys with `isValidKey`, languages against `REC.languages`, and the limits in `REC.limits`. Onboarding answers replace earlier entries with source `onboarding`; `explicitKeys` replace entries with source `tune` at weight 0.5. Cache the assembled context for 5 minutes under `rec:profile:<userId>` and drop it on every write.
- [ ] **Step 6: Add the routes** for onboarding, preview, preferences and feedback from "API contracts". `setFeedback` with `not_interested` also calls `recordAction`.
- [ ] **Step 7: Wire the side effects.** Like added and video saved call `recordAction`. Account deletion calls `deleteForUser`. Replace Task 3's placeholder with the real `profileService.isPersonalized`.
- [ ] **Step 8: Run `npm test`.** Expected: PASS.
- [ ] **Step 9: Commit** `feat(rec): viewer profile, preferences and onboarding API`.

### Task 7: Scoring and re-ranking (server, pure)

**Files:**
- Modify: `src/modules/recommendation/scoring.js`
- Test: `tests/rec-scoring.test.js`

**Interfaces:**
- Consumes: `REC`, `ViewerContext`, `keyLabel`.
- Produces:
  - `interestScore(features: string[], weights) → number`
  - `isExcluded(video, ctx) → boolean`
  - `scoreVideo(video, ctx, now) → { score, components: { interest, follow, trending, fresh, quality }, topKey: string | null }`
  - `jaccard(a: string[], b: string[]) → number`
  - `relatedScore(seed, video, ctx) → number`
  - `rerank(ranked: [{ video, score, source, topKey }], explorePool: [video], { pageSize, channelCap, exploreSlots, random }) → [{ id, source, topKey }]`
  - `reasonFor(source, topKey, ctx) → { type, label }`
  - Scored video shape: `{ _id, user_id, features, language, likes, dislikes, publishedAt, durationSeconds, stats: { trending } }` with `user_id` unpopulated.

- [ ] **Step 1: Write the failing tests.** `context(partial)` is a test helper that returns a complete `ViewerContext` with empty defaults; a weight given as a number `n` becomes `{ w: n, explicit: n, inferred: 0 }`.

```js
const now = new Date('2026-11-13T00:00:00Z');
const video = { _id: 'v1', user_id: 'o1', features: ['cat:music', 'fmt:story'], language: 'hi', likes: 3, dislikes: 1,
  publishedAt: new Date(now - 14 * 86400000), durationSeconds: 600, stats: { trending: 0.5 } };
const ctx = context({ weights: [['cat:music', 0.3], ['fmt:story', 0.5]], subscribedOwners: ['o1'] });

test('score matches the formula', () => {
  const r = scoreVideo(video, ctx, now);
  assert.ok(Math.abs(r.components.interest - 0.65) < 1e-9);
  assert.ok(Math.abs(r.score - 0.648515) < 1e-6);
  assert.equal(r.topKey, 'fmt:story');
});

test('multipliers and exclusions', () => {
  assert.ok(Math.abs(scoreVideo(video, { ...ctx, watched: new Map([['v1', 540]]) }, now).score - 0.162129) < 1e-6);
  assert.ok(Math.abs(scoreVideo({ ...video, language: 'en' }, { ...ctx, languages: ['hi'] }, now).score - 0.324258) < 1e-6);
  assert.ok(Math.abs(scoreVideo({ ...video, language: 'und' }, { ...ctx, languages: ['hi'] }, now).score - 0.648515) < 1e-6);
  // No duration: never treated as watched.
  assert.ok(Math.abs(scoreVideo({ ...video, durationSeconds: undefined }, { ...ctx, watched: new Map([['v1', 540]]) }, now).score - 0.648515) < 1e-6);
  assert.equal(isExcluded(video, { ...ctx, excluded: new Set(['cat:music']) }), true);
  assert.equal(isExcluded(video, { ...ctx, hiddenCreators: new Set(['o1']) }), true);
  assert.equal(isExcluded(video, { ...ctx, notInterested: new Set(['v1']) }), true);
  assert.equal(isExcluded(video, { ...ctx, viewerId: 'o1' }), true);
});

test('a guest scores on trending, freshness and quality only', () => {
  const r = scoreVideo(video, context({}), now);
  assert.equal(r.components.interest, 0);
  assert.equal(r.components.follow, 0);
  assert.equal(r.topKey, null);
});

test('jaccard', () => assert.ok(Math.abs(jaccard(['a', 'b'], ['b', 'c']) - 1 / 3) < 1e-9));
```

  `rerank` tests, with a seeded `random`:
  - Five top-scored videos from one owner plus ten others: the first 12 results contain at most 2 from that owner, and all 15 IDs appear exactly once overall.
  - With `exploreSlots: 2` and a two-video explore pool: results at index 3 and 8 have source `explore`.
  - With an empty explore pool: no gaps, and no `explore` sources.
  - With 4 ranked videos and no pool: exactly 4 results.
  - The same seed gives the same order twice.
  - `reasonFor('interest', 'fmt:story', ctx)` returns `{ type: 'explicit', label: 'Stories' }` when explicit ≥ inferred, and `inferred` otherwise.

- [ ] **Step 2: Run `node --test tests/rec-scoring.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement the functions** from "Scoring" and steps 3–4 of "Feed build". `topKey` is the matching key with the highest `w`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(rec): scoring and re-ranking`.

### Task 8: Feed service, endpoints, Home and related (server)

**Files:**
- Create: `src/modules/recommendation/candidates.repository.js`, `src/modules/recommendation/feed.service.js`
- Modify: `recommendation.routes.js`, `src/modules/home/home.service.js`, `src/modules/home/home.routes.js`, `src/modules/catalogue/catalogue.routes.js`, `src/app.js`, `tests/home.test.js`
- Test: `tests/rec-feed.test.js`

**Interfaces:**
- Consumes: `loadViewerContext`, `scoreVideo`, `isExcluded`, `relatedScore`, `rerank`, `reasonFor`, `createRecCache`, `publicFilter`, `videoCard`, `readableVideo`.
- Produces:
  - `createFeedService({ repo, profileService, cache, now, randomFor }) → { firstPage, nextPage, related }`
  - `firstPage({ viewerId, hints, languages, category, limit }) → Promise<FeedPage>`
  - `nextPage({ cursor, limit }) → Promise<FeedPage>`; throws `FeedExpiredError` (HTTP 410)
  - `related({ viewerId, seedVideoId, limit }) → Promise<{ requestId, items }>`
  - `FeedPage = { requestId, items, nextCursor, hasMore, personalized }`
  - `repo = { pool(name, ctx, { category, type }), byIds(ids), relatedPools(seed) }`. `byIds` returns only currently eligible videos, populated for `videoCard`.

- [ ] **Step 1: Write the failing tests** with a fake repo over an in-memory video list and a fake cache.

```js
test('pages are stable and never repeat', async () => {
  const p1 = await feed.firstPage({ viewerId: 'U1', limit: 12 });
  const p2 = await feed.nextPage({ cursor: p1.nextCursor, limit: 12 });
  const ids = [...p1.items, ...p2.items].map(i => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(p2.requestId, p1.requestId);
});

test('a video made private between pages is skipped', async () => {
  const p1 = await feed.firstPage({ viewerId: 'U1', limit: 12 });
  makePrivate(idAtSnapshotIndex(13));
  const p2 = await feed.nextPage({ cursor: p1.nextCursor, limit: 12 });
  assert.equal(p2.items.some(i => i.id === idAtSnapshotIndex(13)), false);
});

test('small catalogues return fewer items without padding', async () => {
  useCatalogue(threeVideos);
  const p = await feed.firstPage({ viewerId: null, limit: 12 });
  assert.equal(p.items.length, 3);
  assert.equal(p.hasMore, false);
  assert.equal(p.personalized, false);
  assert.equal(p.items.some(i => i.rec.source === 'interest'), false);
});

test('cache failure degrades to a single page', async () => {
  cache.fail();
  const p = await feed.firstPage({ viewerId: 'U1', limit: 12 });
  assert.equal(p.items.length, 12);
  assert.equal(p.hasMore, false);
  assert.equal(p.nextCursor, null);
});

test('expired snapshot', async () => {
  await assert.rejects(feed.nextPage({ cursor: cursorFor('missing', 12), limit: 12 }), { name: 'FeedExpiredError' });
});
```

  Also assert: when every video's `stats.trending` is 0 (the job has never run), a guest's first page is ordered newest first; an excluded key, a hidden creator, a not-interested video and the viewer's own video never appear; `category: 'music'` returns only `cat:music` videos; `related` excludes the seed, returns at most `limit`, holds at most 3 from one owner, and every item has `rec.source === 'related'`.

  HTTP tests with `app.inject`: `GET /recommendations` with a malformed cursor gives 400; with an expired cursor gives 410 and code `FEED_EXPIRED`; `GET /home` when the feed service throws still returns 200 without a `for-you` section; `GET /home` for a personalized viewer has `sections[0].id === 'for-you'` and a `requestId`.

- [ ] **Step 2: Run `node --test tests/rec-feed.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement `candidates.repository.js`** with the pool table in "Feed build" and, for related, three pools: `features` in the seed's features (200), same owner (20), trending (50), all excluding the seed and matching the seed's `type`. Every query selects only the scored-video fields, uses `.lean()` and `.maxTimeMS(4000)` like `home.repository.js`.
- [ ] **Step 4: Implement `feed.service.js`** following "Feed build" steps 1–6 and its failure behaviour. `randomFor(snapshotId)` returns the seeded PRNG.
- [ ] **Step 5: Add `GET /recommendations`** and replace the handler body of `GET /video/:videoId/related` with `feed.related`, keeping its existing response fields.
- [ ] **Step 6: Extend Home.** Add `optionalAuthenticate` and the `hints` and `languages` query fields to the route. `getHome(query, viewer)` prepends the `for-you` section when the context is personalized and always adds `requestId`. Compute `featured` before prepending.
- [ ] **Step 7: Run `npm test`.** Expected: PASS.
- [ ] **Step 8: Commit** `feat(rec): personalized feed, related and Home integration`.

### Task 9: "For you" on Home, reasons and feedback (client)

**Files:**
- Create: `app/routes/api.feed.tsx`, `app/routes/api.rec-feedback.tsx`
- Modify: `app/services/home.server.ts`, `app/routes/_index.tsx`, `app/components/VideoCard/VideoCard.tsx`, the Watch route (related list), `app/lib/api.ts` (`recApi`)

**Interfaces:**
- Consumes: `GET /home`, `GET /recommendations`, `PUT /user/me/recommendation-feedback/:videoId`, `Tracking`.
- Produces: `VideoCard` props `reason?: { type: string; label?: string }` and `feedback?: boolean`.

- [ ] **Step 1: Forward viewer context from the loader.** `fetchHome` sends the session token when present. For guests it reads the `ld_hints` cookie (JSON `{ keys, languages }`, at most 1 KB, ignored when malformed) and sends `hints` and `languages`.
- [ ] **Step 2: Render the `for-you` section** first when present, passing each card `tracking` (`requestId`, index, surface `home`, the item's `rec.source`) and `reason`. Give the other rows `tracking` too, with source `trending` or `fresh`.
- [ ] **Step 3: Show the reason** as one muted line on the card, using the copy in "Feed build". Show nothing for an unknown type.
- [ ] **Step 4: Add the card menu** with the existing shadcn `DropdownMenu`: "Not interested" and "Don't recommend this channel". They post through `api.rec-feedback.tsx`. On success the card collapses to a one-line "Removed. Undo" that posts `active: false`. Guests see a link to sign in.
- [ ] **Step 5: Add "Load more"** under For you. It calls `api.feed.tsx?cursor=`. On a 410 it reloads the page loader and starts again.
- [ ] **Step 6: Render related videos** on the Watch route from the upgraded endpoint with surface `related`.
- [ ] **Step 7: Verify.** `npx tsc --noEmit` and `npx vite build` pass. In the browser: a signed-in viewer with personalization on sees For you; "Not interested" removes the card and it stays gone after a reload; Undo brings it back; Load more appends without duplicates.
- [ ] **Step 8: Commit** `feat(rec): For you row, reasons and feedback controls`.

### Task 10: Onboarding and "Tune your feed" (client)

**Files:**
- Create: `app/routes/onboarding.tsx`
- Modify: `app/routes/settings.tsx`, `app/routes/_index.tsx` (entry banner), `app/lib/api.ts`

**Interfaces:**
- Consumes: `GET /recommendation-onboarding`, `POST /recommendation-onboarding/preview`, the preferences endpoints, `GET /recommendations`.

- [ ] **Step 1: Build `/onboarding` as a stepped flow.** Intro with the spec's copy and **Start** / **Skip**. Then one question per screen from the API, multi-select, each with **Skip**. Then the video pick step, fed by `GET /recommendations` without hints; skip this step entirely when fewer than 6 videos come back. Then a summary from the preview endpoint, listing the key labels with **Looks good**, **Change** and **Skip**.
- [ ] **Step 2: Save the result.** Signed in: `PUT` preferences with `personalizationEnabled: true` and the `onboarding` payload. Guest: write the previewed keys and languages to the `ld_hints` cookie (180 days, `SameSite=Lax`). Skipping saves `onboarding.skipped` for signed-in viewers and nothing for guests. Then go Home.
- [ ] **Step 3: Add the Home banner** for viewers with no completed or skipped onboarding: one line, a **Personalize** link and a dismiss button. Remember the dismissal in `localStorage`.
- [ ] **Step 4: Add a "Tune your feed" card to Settings.** A personalization switch with one sentence on what it uses; language checkboxes; discovery (Less / Balanced / More); removable chips for chosen topics; a list of excluded topics; a read-only "From what you watch" list with **Reset**, which calls `DELETE ?scope=inferred`; **Reset everything**; and **Answer the questions again**.
- [ ] **Step 5: Verify.** `npx tsc --noEmit` and `npx vite build` pass. In the browser: complete onboarding signed in and see matching "Because you chose …" cards; complete it as a guest and see the cookie drive the feed; turn personalization off and confirm For you disappears.
- [ ] **Step 6: Commit** `feat(rec): onboarding flow and feed settings`.

### Task 11: Baseline report and end-to-end check

**Files:**
- Create: `scripts/rec-report.js`
- Modify: `docs/api-progress.md` (record results)

- [ ] **Step 1: Write `scripts/rec-report.js --days 7`.** Print, per surface: impressions, clicks, CTR, plays, views, watch seconds per play, `not_interested` count. Then print catalogue coverage (distinct videos with an impression ÷ eligible videos) and the share of impressions by `source`. It only reads.
- [ ] **Step 2: Run the backfill** against the test database with `--dry-run`, then for real.
- [ ] **Step 3: Check the flow by hand** on live MongoDB and Redis with at least 30 public videos across 3 categories and 2 languages:
  - A new viewer completes onboarding and For you reflects the choices.
  - Watching two videos of one category raises that category in "From what you watch" within 5 minutes.
  - A private, unfinished or deleted video never appears in any row, including on page 2 after being made private.
  - Stopping Redis leaves Home working with a single page.
  - Deleting the account removes the profile and unlinks its events.
  - Replaying one captured `/api/events` payload does not change `views`.
- [ ] **Step 4: Run the report** and paste its output into `docs/api-progress.md` as the baseline. Set no numeric targets before this exists.
- [ ] **Step 5: Commit** `chore(rec): baseline report and verification notes`.

---

## Not in this plan

The Following page is untouched and stays chronological.

| Item | Why later | Where it plugs in |
| --- | --- | --- |
| Shorts feed ranking | Needs a working Shorts route and swipe signals. | A third surface in `feed.service.js`; `shorts` is already a valid event surface. |
| Search quality (text index, search page) | Separate feature; the client route does not exist yet. | Events from results use surface `search` and already earn the ×1.5 signal. |
| Transcripts and content embeddings | Needs a provider and budget decision. | A `similar` candidate pool and a term in `relatedWeights`. |
| Learned ranker, collaborative retrieval, A/B platform | Need traffic the product does not have yet. | Replace `scoreVideo`; `policy` on events already separates versions. |
| Impression-fatigue suppression, hide-a-topic from a card, a "Why this video?" panel | Not needed to ship v0. | `scoring.js` and the card menu. |
| Abuse resistance beyond rate limiting | Required before public launch (spec §10). New session IDs can still inflate views. | `events.service.js`. |
| Dislike and subscribe as profile signals | Kept out to keep the signal set small. | `REC.signal` and `recordAction`. |
