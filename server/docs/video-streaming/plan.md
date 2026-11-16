# LokDarpan adaptive video streaming: buildable v0

Status: **DESIGN ONLY. No implementation or playback verification is claimed.**
Source inspection: 2026-11-13. Numeric settings below are proposed starting defaults, not measured performance or decisions already approved by Raj.

## 1. Outcome and approach

A viewer presses Play and gets a usable picture on an uneven mobile connection. Quality adapts to actual downloads and buffered media; signal bars are not the control input. Audio, position and the existing Watch design survive quality changes. Raj's completion rule applies: backend work is not complete until the intended UI uses it and the real flow is verified.

First delivery is recorded video (VOD), up to 1080p output, using native HLS and hls.js. Auto is default; add data saver and manual quality where enforceable. Live broadcasts, offline downloads, DRM, 4K output, extra codecs and recommendation ranking are outside v0. Transcription must not block playback.

| Approach | Tradeoff | Decision |
| --- | --- | --- |
| Improve existing FFmpeg + BullMQ + S3 + HLS | Reuses code; we own encoding, delivery and recovery | Proposed v0 |
| Managed video service | Outsources operations but needs provider, migration and budget decisions | Reconsider after measured operational cost |
| Progressive MP4 only | Simple fallback but no adaptive rendition switching | Insufficient for the requested behavior |

## 2. Current findings and blockers

Source findings, not deployed observations. Paths are repository-relative.

| File | Finding | Required change |
| --- | --- | --- |
| server/src/contexts/transcoding/application/runTranscodePipeline.js | Six height-based rungs, fixed bandwidth and AVC/AAC declarations; rejects sources below 144 pixels high | Source-aware ladder and measured manifests |
| server/src/contexts/transcoding/infrastructure/ffmpegRunner.js | CRF without maxrate/bufsize; six-second target without explicit keyframe alignment | Bounded bitrate and aligned independent segments |
| Pipeline catch block + server/src/shared/messaging/transcodeQueues.js | Two queue attempts configured, but encoding errors normally resolve after emitting failure | Propagate retryable failures; terminal failure only after exhaustion |
| Pipeline publication | One mutable output prefix; upload order follows directory walk; optional raw deletion before result enqueue | Versioned outputs, master last, durable completion before cleanup |
| server/src/modules/video/listeners/transcodeResult.listener.js | Late failure can replace COMPLETED; any success for a completed video is ignored | Generation-aware conditional updates |
| server/src/modules/video/services/video.service.js | Multipart path enqueues before saving video; completion has read/enqueue/update race | Persist processing intent first; idempotent completion |
| server/src/services/storage.service.js | General upload helpers request public-read; playback uses direct S3 URLs | Separate raw/private storage and public derivatives; verify bucket policy |
| client/app/components/VideoPlayer/HlsPlayer.tsx | Basic attachment only; no quality/recovery UI; native cleanup absent | Lifecycle-aware player and truthful capabilities |
| client/app/routes/watch.$id.tsx and watch.$videoId.tsx | Competing dynamic routes; latter uses sample MP4 and document during render | One real-data Watch route with SSR-safe controls |

server/docs/api-progress.md records outstanding MongoDB/UI verification. Recheck the environment before execution; this is not proof that a database is currently unavailable. This document does not change API completion statuses.

## 3. Encoding defaults

### Input and normalization

Proposed test-deployment limits: 1 GiB source, 30 minutes, 3840 pixels on the longer displayed edge, 60 fps input. Enforce byte limits at upload issuance where supported and from stored object metadata before download. Inspect actual media with ffprobe. Reject empty, malformed, encrypted, non-video and unsupported HDR/color input with creator-readable reasons.

Support decodable SDR MP4/MOV/WebM; reconcile both upload paths and stop labeling every presigned upload as MP4. Normalize rotation and sample aspect ratio once. Fit within a landscape bounding box, swapped for portrait, using even dimensions and no upscale. Deduplicate equal outputs. Below the lowest box, emit one source-sized rendition if both displayed dimensions are at least 2 pixels.

Use one common constant output frame rate across all rungs: preserve standard rates up to 30 fps, reduce higher rates to 30, and use 30 for variable-frame-rate input. Preserve source timing and audio sync. Select the first video and optional first audio stream. Poster time is min(one second, half duration), including sub-second clips.

### Initial bitrate ladder

H.264 Main, yuv420p, optional AAC-LC stereo at 48 kHz, MPEG-TS HLS, existing fast preset and one encode job per worker. Labels are landscape-equivalent; expose actual width/height for portrait videos.

| Landscape box (swap for portrait) | CRF | Video maxrate | VBV bufsize | Audio |
| --- | ---: | ---: | ---: | ---: |
| 256 x 144 | 30 | 180 kbps | 360 kbit | 48 kbps |
| 426 x 240 | 29 | 320 kbps | 640 kbit | 48 kbps |
| 640 x 360 | 28 | 650 kbps | 1300 kbit | 64 kbps |
| 854 x 480 | 27 | 1100 kbps | 2200 kbit | 96 kbps |
| 1280 x 720 | 25 | 2400 kbps | 4800 kbit | 128 kbps |
| 1920 x 1080 | 23 | 4500 kbps | 9000 kbit | 128 kbps |

Generate boxes that fit inside normalized source dimensions. If the source falls between boxes, also fit it into the next box without upscaling, bounded at 1080-equivalent. That may produce a source-sized rendition; deduplicate it. Tiny sources use the lowest row's settings. Store actual dimensions, not invented standard resolutions. These are encoding limits, not promised segment bitrates or image quality; evaluate speech, music, motion, screen text and low-light footage.

### Segments and manifests

Use a four-second segment target, replacing six seconds. Force closed-GOP keyframes on the same four-second timeline for all renditions; prevent scene cuts from disrupting the intended boundaries. Verify random-access starts and alignment before asserting independent segments. Final segments may be shorter; four seconds is not a guaranteed switching time. [FFmpeg HLS muxer](https://ffmpeg.org/ffmpeg-formats.html#hls-2).

Inspect complete outputs before publication. Calculate average bandwidth as total segment bits divided by total EXTINF duration. Calculate peak bandwidth over contiguous windows spanning 0.5 to 1.5 times TARGETDURATION; for an entire asset shorter than that window, conservatively use available segment rates and validate the short-asset case. Include container overhead. Publish measured bandwidth, actual resolution/frame rate and codec identifiers derived from encoded AVC configuration and present audio. Never declare AAC for silent clips. Validate nonempty segments, referenced files, ENDLIST and duration consistency. [RFC 8216](https://www.rfc-editor.org/rfc/rfc8216.html#section-4.3.4.2).

## 4. Reliable processing and publication

1. Persist the video and processing generation before enqueue. Use deterministic job identity per video/generation. Store a pending enqueue marker in MongoDB; reconcile every 60 seconds. Enqueue followed by a crash must be safe to repeat. Both upload entry points use this mechanism.
2. Validate owner, state and stored object. Atomically claim a generation. Repeated completion for the same upload returns its existing processing/ready state instead of scheduling another encode. Before enqueue, freeze the input into a private generation-specific processing key using a conditional server-side copy of the observed object (ETag/version precondition). Validate the copied object's size/metadata and persist its identity. Never overwrite that key; all attempts read it, not the still-writable upload target. A changed source during this step fails/restarts the capture, not the encode. Reconcile interrupted captures; expired upload targets and orphan captures enter reference-aware cleanup. This prevents a still-valid presigned PUT from changing bytes between retries.
3. Output to videos/{id}/hls/{generation}/{attempt}/... so retries never overwrite published assets. Internally store profile version, source metadata, generation, asset inventory and measured renditions.
4. Keep two queue attempts and existing 30-second exponential backoff initially. Invalid media fails without retry; transient failures reject the job. Set a 60-minute attempt deadline, kill child processes on expiry/cancellation, bound captured logs and check scratch space. Reconcile exhausted/stalled jobs after worker restarts.
5. Validate locally, upload segments first, variants second, master last. Verify object inventory and fetch master, variants and representative segments through the delivery path. No playback URL is returned before publication.
6. Apply success only to the matching generation using a conditional database update. Atomically store the published generation, metadata and COMPLETED state. Duplicates are harmless; stale failure cannot undo completion. Re-encoding keeps the last published generation playable until replacement succeeds. Deletion prevents late results from recreating the video.
7. Persist terminal outcome before acknowledging result delivery; reconcile missing results using job state and asset inventory. Queue outages must not erase encoded output or trigger raw deletion.
8. Disable immediate raw deletion. Proposed retention: successful raw sources seven days after database publication; failed sources seven days after terminal failure; unreferenced outputs 24 hours after their generation terminates. Skip active/retryable generations, check references, and retry failed deletion. Current storage helpers swallowing errors are not evidence of successful cleanup.

Media lifecycle state is separate from visibility. COMPLETED never implies public. Add separate published-generation metadata and active-processing state (generation, pending-enqueue/queued/encoding/failed/succeeded, safe error). For an initial upload, legacy status follows processing and becomes COMPLETED only on first publication. During re-encoding, keep legacy status COMPLETED and Watch/catalogue eligibility tied to the existing published generation; replacement progress/failure appears only in owner processing status. Replacement failure never hides the published version. Publication atomically swaps the published pointer and finishes active processing. Visibility and deletion checks still apply to both generations.

## 5. Delivery and access

Raw uploads are private regardless of eventual visibility. Remove public ACL assumptions for raw files and inspect actual bucket/object policies. Use HTTPS, explicit MIME types and CORS for app origins and GET/HEAD/range requests. Verify through the browser, not just the SDK.

**Public alpha:** use only newly created deliberately public test assets in an isolated namespace. Immutable generation assets may be cached; playback metadata is revalidated. Do not advertise private/network streaming as complete. Disable private/unlisted playback and public-to-private transitions in this alpha unless protected delivery is implemented. A metadata check cannot revoke an already-public media URL.

**Protected-delivery milestone:** private origin plus authorization for master, child playlists, segments and posters. Proposed target: CloudFront signed cookies on a first-party media subdomain. Provider, domain and budget remain release decisions. Signing only the master URL does not protect relative children. [AWS signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html).

Propose five-minute grants, refreshed at four minutes during active playback after backend access recheck. Cookie delivery must use the configured first-party media host with HttpOnly/Secure/SameSite scope and exact-origin credentialed CORS. No storage credentials enter the client. Document maximum grant lifetime and cache/revocation behavior; previously downloaded bytes cannot be revoked. Network membership authorization must exist before network playback is enabled. Immediate per-request revocation would require an authenticated gateway instead.

CDN provisioning and legacy public-object migration remain blocked on infrastructure selection. Before general release, audit old URLs, migrate/restrict legacy objects and test direct-origin bypass. Public alpha is not a substitute for this gate.

## 6. Watch API contract

Reuse GET /api/v1/video/:videoId. Add a nested public-safe playback object; migrate existing URL consumers and then remove legacy fields. Update Fastify response schemas and client types together.

| Field | Meaning |
| --- | --- |
| playback.status | ready, processing, failed or unavailable; explicit mapping from existing states |
| playback.source | Ready only: master URL, MIME type, generation, optional grant expiry; otherwise null |
| playback.renditions | Stable ID, label, actual width/height, peak/average bits per second, frame rate; no storage keys |
| playback.durationSeconds, posterUrl | Validated values, null when absent or access is not allowed |
| playback.errorCode, retryable | Safe code and retry affordance; no raw FFmpeg/worker logs |

Guests can read completed public videos. Owners can see their processing/failed state. Unauthorized/private/missing videos return consistent unavailable/404 behavior without leaking metadata. Legacy fields must not disclose a media URL after access changes.

Keep existing initiate-upload, complete-upload and owner-only transcode-status endpoints under /api/v1/video; extend for validated content type, generation/idempotency and safe failure details. Protected playback later adds POST /api/v1/video/:videoId/playback-session to recheck access, mint/refresh grants through the first-party media flow and return expiry with no-store caching. Quality switches themselves require no new application API; the player requests HLS variants.

## 7. Player defaults and interaction

The [client checklist](../../../client/docs/video-streaming/plan.md) covers the integration. Preserve the Watch layout. Make watch.$videoId.tsx authoritative, bringing over the real loader/data handling from watch.$id.tsx before removing the duplicate. Remove sample playback and render-time document access.

| Concern | Proposed v0 behavior |
| --- | --- |
| Engine | Native HLS when supported, otherwise hls.js, otherwise visible unsupported state |
| Startup | hls.js starts at lowest compatible rung, then remains Auto; native chooses its start |
| Adaptation | Library/browser ABR only; no parallel signal-bar controller |
| Buffer | hls.js: 30-second forward target, 60-second maximum forward horizon, 30-second back buffer, 30 MB buffer budget; not exact memory guarantees |
| Auto cap | Player dimensions plus dropped-frame protection; data saver applies the stricter cap |
| Data saver | Auto up to 360-equivalent on hls.js; if none fits, lowest available with actual size disclosed. Toggle says “Enable Data saver and switch to Auto” when a manual level is locked; this explicit action releases the lock and applies capped Auto. Turning it off stays Auto. Persist locally with reset |
| Manual | Actual compatible levels only; preserve position/pause intent; explicit return to Auto. Disable choices above data-saver cap |
| Manual stalls | Two rebuffers within 30 seconds: offer Switch to Auto; never silently override a locked selection |
| Native | Auto only initially; hide manual/data-saver controls that cannot be enforced |
| Lifecycle | Source change destroys instance/listeners, aborts old requests, clears native source and resets per-video state |

Use explicit installed-version APIs for startup, automatic selection, buffer policy and effective caps. Player-size logic must not overwrite a stricter data-saver cap. Verify against the lockfile; package.json requests ^1.6.16. [hls.js v1.6.16 API](https://github.com/video-dev/hls.js/blob/v1.6.16/docs/API.md).

States: metadata loading -> processing/failed/unavailable OR media loading -> paused/playing -> buffering/recovering -> playing OR error. Autoplay rejection shows Play and is not an error. Pause, seek and background suspension are not rebuffers. Controls stay available with keyboard focus. Preserve portrait video with contain sizing.

Recovery: hls.js request policies handle at most two retries per request, delays 1s then 2s, 10s manifest deadline and 20s segment deadline. Do not add a competing reload loop. Fatal decode errors get one media recovery per source, then visible failure. Offline preserves time/pause intent; allow one recovery on reconnection, then explicit Retry. Terminal 404/unsupported media does not loop. Protected 401/403 permits one grant refresh, then stops. Same-source retry restores valid position and must not count as a new view. Native follows the same user-visible retry budget; its internal retries may be unobservable.

## 8. Diagnostics and cost

Start with a local/test diagnostic panel and exported test results; no new production viewer-event collection in v0. Capture play-intent-to-first-advancing-frame startup, eligible playback time, rebuffer duration/count, selected quality where observable, switches, dropped frames and error codes. Native unavailable measurements stay unavailable. Do not export signed URLs, auth headers, IPs or identity. Delete test traces after seven days. Production telemetry needs its own retention/consent design.

Measure encode wall time, source/output bytes and served bytes. Estimate cost from stored GB-month, delivered GB, request count and machine-hours multiplied by actual provider rates. Dimensional example only: continuous 1 Mbps for an hour is about 0.45 GB before delivery overhead. Maxrate settings do not predict the storage bill. Defer per-title encoding and additional codecs until measurements justify them.

## 9. Build order and completion gates

Honor Raj's order: implement the scoped batch, then run a combined verification pass. Track designed / implemented-awaiting-verification / verified. All steps below start **designed**.

| Step | Work | Required evidence |
| --- | --- | --- |
| S1 | Probe, ladder, FFmpeg, manifests | Real encoded fixtures and measured codec/bandwidth/alignment |
| S2 | Queue contracts, generation-aware service/listener, publication/cleanup | Real Redis/MongoDB repeat completion, restart, stale result, exhaustion and interrupted upload |
| S3 | Safe playback DTO, storage separation, isolated delivery | Authorized API and browser access to asset set; raw uploads denied |
| S4 | Single Watch route, HlsPlayer, quality/recovery UI | Actual API -> master -> player, SSR build, mobile/desktop navigation and cleanup |
| S5 | Combined regression/throttling verification | Recorded device matrix and lab results below |
| S6 | Protected delivery, legacy migration, visibility transitions | Segment/origin denial, expiry/refresh/revocation and applicable membership checks |

S1-S5 establish a **public alpha**, not general streaming completion. S6 is required before private/visibility features are advertised as protected. Mocks, code review and builds alone cannot mark streaming complete.

### Combined validation

Fixtures: speech, music, motion, screen text, silent, portrait, rotated metadata, non-square pixels, 60 fps, variable frame rate, under-144 source, sub-second source, corrupted input and rejected HDR. Include one real creator upload. Inspect all rendition boundaries and seek/switch between every pair. Proposed lab tolerances: <= one normalized frame of boundary mismatch, <= 100 ms audio/video sync error.

First browsers: Chrome/Android, Chrome/desktop, Safari/iPhone; then Firefox/desktop and Safari/macOS. Record actual versions/devices and engine. Mobile viewport emulation is not iPhone playback evidence. Missing coverage remains an explicit release limitation.

Use repeatable five-minute clips, ten runs per engine/profile. Shape media traffic, record cache state and test cold-cache startup. Proposed lab gates, not production promises:

| Network | Expected behavior |
| --- | --- |
| 10 Mbps, 50 ms RTT | p95 startup <= 3s; rebuffer ratio <= 1% |
| 600 kbps, 150 ms RTT | p95 startup <= 6s; sustainable low rung; post-start rebuffer ratio <= 2% |
| 10 Mbps -> 600 kbps at 60s -> 10 Mbps at 120s | Once downloads reveal reduced throughput, request lower sustainable quality within two segment opportunities when needed; resume within 12s after recovery |
| Offline for 15s | Visible state, no reload storm, restored position and pause intent |
| 1 Mbps, 300 ms RTT, 1% loss | Record results; no crash, stuck controls or runaway retries; no initial numeric quality gate |
| Below lowest measured total bitrate | Honest buffering/error; no promise of uninterrupted playback |

Allow up to 30 seconds after successful recovery downloads to request a higher sustainable level when caps/manual selection permit. Observe requested segments, since buffered media delays displayed changes. On native HLS use controlled delivery traces; if quality cannot be observed, its switching gate is unverified.

Rebuffer ratio is unexpected post-first-frame stall time divided by playing-plus-unexpected-stall time, excluding intentional pause/seek/background time. Ten-run p95 is a lab check, not a population reliability estimate; report engines separately.

After implementation, run existing server tests and client typecheck/build. Check sample URLs, route duplication, retry view-count inflation, listener leaks, retry bounds, private leakage and SSR. Execute upload -> queue -> transcode -> database -> API -> Watch with real MongoDB, Redis and test storage. Write evidence to each repo's docs/video-streaming/verification.md only after execution.

Rollout uses separate encoding/player flags and a small deliberate test cohort. Preserve previously validated generations for rollback. Rollback cannot restore public access to private media or publish known-invalid assets.

## 10. Open questions for Raj

These block the indicated deployment decisions, not drafting/local implementation. Defaults do not authorize purchases, production changes or deletion of existing uploads.

| Question | Proposed default | Blocks |
| --- | --- | --- |
| Which test storage/CDN/domain and monthly spending ceiling are available? | Existing S3 integration, isolated namespace, no paid provisioning; evaluate CloudFront for protection | Hosted verification and protected delivery |
| Must first release include private family/network videos; how fast must revocation stop access? | Public-only alpha, protected beta before private release; proposed five-minute maximum grant window | Release scope and access architecture; immediate revocation needs gateway |
| Are 1 GiB, 30 minutes, 1080p output and seven-day raw retention acceptable? | Use for fixtures/local implementation, no cleanup of existing uploads | Creator limits and automatic cleanup rollout |

Other drafting defaults: mobile web first, Auto plus supported manual/data saver, no silent manual override, no production viewer diagnostics collection and four-second VOD segments. Change them after evidence without reopening the entire architecture.
