# Watch streaming integration

Status: **DESIGN ONLY; not implemented or browser-verified.**

The [server streaming plan](../../../server/docs/video-streaming/plan.md) owns encoding, access, API contracts, defaults and release gates. This checklist identifies client work required before streaming counts as UI-integrated. Recommendation work is separate.

## Route and API

Consolidate `app/routes/watch.$id.tsx` and `app/routes/watch.$videoId.tsx` into one `watch.$videoId.tsx`, retaining the existing design and moving the real loader behavior across. Fetch authorized video detail for the route ID and consume its explicit `playback` object. Remove sample MP4 and duplicate route after migration. Guard browser APIs from server rendering; track fullscreen through effects/events.

Extend `app/lib/api.ts` with playback status, source MIME/generation, actual rendition dimensions, bandwidth, expiry and safe error types. Render processing/failed states for owners and unavailable for unauthorized/missing videos. A nonempty URL alone is not proof of readiness. No raw storage keys or worker logs enter the UI.

## Player and controls

Keep `app/components/VideoPlayer/HlsPlayer.tsx` as the playback owner. Connect existing controls through a media ref and state/events; avoid a second video element or competing play/seek handlers. Source changes cancel prior work. Same-source retry preserves valid position and pause intent; a different video resets them.

Show Auto by default. On hls.js, also offer actual compatible renditions and Data saver (up to 360-equivalent). Actual quality and selected preference are distinct. Native HLS stays Auto unless another capability is genuinely enforceable. Do not show a nonfunctional selector or pretend data saver works. Preserve portrait aspect ratio using contain sizing.

When a manual level is locked, label the data-saver action `Enable Data saver and switch to Auto`. Activating it explicitly releases the lock and applies capped Auto; turning data saver off stays Auto. This is a viewer-requested mode change, not a silent quality override. A failed background re-encode leaves the current published video playable; show replacement processing/failure separately to its owner.

Example states:

- Playing: `Quality: Auto (360p)` when actual quality is observable.
- Data saver: `Quality: Auto - Data saver`; higher manual options disabled.
- Repeated manual stalls: `Connection is struggling. Switch to Auto`.
- Processing: `Your video is processing.`
- Offline: `Connection lost. Playback will resume when it returns.`
- Recoverable error: `Video could not load. Retry`.
- Unsupported: `This browser cannot play this video.`

Follow the server plan's bounded recovery policy. Autoplay rejection leaves a Play button. Retry must not create a duplicate view. Buttons need accessible names, keyboard focus and usable touch targets. Controls stay visible while focused. Announce errors without repetitive screen-reader alerts.

Native cleanup pauses, clears source and releases listeners; hls.js also destroys its instance. Ignore callbacks from previous sources. Abort fetches/polling on navigation. For processing owners, poll every five seconds while visible for at most two minutes, then offer manual refresh; pause in hidden tabs. Never poll forbidden/not-found videos.

## Completion evidence

Implement the batch first, then perform the combined checks Raj requested. A passing typecheck/build does not establish playback.

- Verify actual API/database/generated HLS in Watch, including a real upload.
- Check direct navigation/server rendering, source changes, seeking, fullscreen, pause, Auto/manual, data saver, processing, errors and retry.
- Run the server plan's throttling matrix on hls.js and native HLS; record actual browser/device coverage and gaps.
- Check source/listener cleanup and no view-count inflation on retry.
- Verify guest/public access and denials. Private playback remains blocked until protected delivery is tested down to segments and origin access.

Record results in `docs/video-streaming/verification.md` after execution. Until then the feature remains awaiting implementation/verification. This plan does not authorize a broad Watch redesign.
