# Creator Studio API contract

Shared contract between the client (Claude) and server (Codex). Prefix `/api/v1`. Auth = existing session/JWT auth used by the other protected routes. Follow the existing module layout (routes / controllers / services / schemas) and the existing response/error envelope. Do not invent a new envelope.

Already present (verify, reuse, do not break): video `initiate-upload`, `complete-upload`, `transcode-status`, `upload`, `GET /video/:videoId`, `PUT /video/:videoId`, `DELETE /video/:videoId`, like/dislike; channel `POST /channel`, `GET /channel/me`, subscribe/unsubscribe; user `GET /user/me`.

## Needed

| Method + path | Purpose | Notes |
| --- | --- | --- |
| `GET /video/me` | Creator's own videos, ALL statuses (uploading, processing, failed, published, unpublished) | `limit` (default 20, max 50), opaque `cursor`, optional `status`, optional `q` title search. Returns `{ items, nextCursor, hasMore }`. Item: id, title, thumbnailUrl, duration, status, visibility, views, likes, commentCount, createdAt, updatedAt. Must be registered BEFORE `/:videoId`. |
| `PUT /video/:videoId` | Edit own video | Verify it accepts title, description, visibility (`public`/`unlisted`/`private`), category, tags, thumbnailUrl; owner only (403 otherwise). Add missing fields. |
| `DELETE /video/:videoId` | Delete own video | Owner only. Verify it also cleans up stored files/jobs or document what it leaves. |
| `GET /channel/:channelId` | Public channel page data | Accept id or handle. name, handle, description, avatarUrl, bannerUrl, subscriberCount, videoCount, createdAt, `viewer: { isOwner, isSubscribed }`. Never expose owner email. |
| `GET /channel/:channelId/videos` | Public published videos of a channel | limit/cursor as above. Published + public only. |
| `PUT /channel/me` | Update own channel | name, handle (unique, 3-30 chars `[a-z0-9_]`, 409 on conflict), description (max 1000), avatarUrl, bannerUrl. |
| `DELETE /channel/me` | Delete own channel | Requires `{ confirmHandle }` in body matching the handle. Also removes or unpublishes its videos (document which). |
| `PATCH /user/me` | Update profile | displayName, bio, avatarUrl. |
| `PUT /user/me/password` | Change password | `{ currentPassword, newPassword }`; 400/401 on wrong current password; min length same as signup. |
| `DELETE /user/me` | Delete account | Requires `{ password }`. |

## Rules
- Validate every body with the module's schema style (same as existing routes).
- Owner checks return 403, missing resources 404, validation 400, conflict 409.
- Never return password hashes, internal storage keys or job internals.
- Do not change existing response shapes. Additive only.
- No git commits. Do not touch `client/`.
- At the end, append a section "Implemented" to this file listing each endpoint as actually built (path, request, response example), plus anything from the table you could not do and why.

## Implemented

All paths below use `/api/v1`. Protected endpoints use the existing `Authorization: Bearer <JWT>` authentication. JSON bodies use Fastify JSON schemas; video edits also accept multipart fields and a `thumbnail` image. Existing response envelopes and compatibility fields are retained. Errors use the existing application envelope (`{"message":"..."}`, with validation `data` when available); existing controller-generated errors retain their `error.message` envelope.

### Video endpoints

- **GET `/video/me`** (authenticated): query `limit` (default 20, 1-50), opaque `cursor`, optional `status` (`uploading`, `processing`, `failed`, `published`, `unpublished`), optional `q` (literal, case-insensitive title search, max 150 characters). Registered before `/:videoId`. Request example: `GET /api/v1/video/me?limit=20&status=processing&q=demo`. Response example:
  ```json
  {"items":[{"id":"cccccccccccccccccccccccc","_id":"cccccccccccccccccccccccc","title":"Demo","description":"A demo","thumbnailUrl":null,"duration":90,"durationSeconds":90,"status":"processing","visibility":"public","views":0,"likes":0,"commentCount":0,"category":"Technology","type":"video","createdAt":"2026-11-13T00:00:00.000Z","updatedAt":"2026-11-13T00:00:00.000Z","publishedAt":"2026-11-13T00:00:00.000Z"}],"nextCursor":null,"hasMore":false}
  ```
  Follow `nextCursor` unchanged with the same filters. Pages sort by descending ObjectId and fetch one extra row to determine `hasMore`; malformed cursors return 400. No status filter includes all stored states. `PENDING`, `PENDING_METADATA`, and `UPLOADING` map to `uploading`; `PROCESSING` to `processing`; `FAILED` to `failed`; `COMPLETED` public videos to `published`; completed private/unlisted videos to `unpublished`. Stored transcoding statuses remain unchanged. Comment counts come from Comment documents.

- **PUT `/video/:videoId`** (owner only): accepts any of `title` (1-200, nonblank), `description` (max 5000, may be empty), `visibility` (`public`/`unlisted`/`private`), `category` (max 100), `tags` (array of up to 50 strings, each max 100, or legacy comma-separated string), `thumbnailUrl` (HTTP(S), max 2048). Request example:
  ```json
  {"title":"Updated demo","description":"","visibility":"unlisted","category":"Technology","tags":["demo","studio"],"thumbnailUrl":"https://example.com/thumbnail.jpg"}
  ```
  Response example (other existing safe video fields are retained):
  ```json
  {"message":"Video updated successfully","video":{"_id":"cccccccccccccccccccccccc","title":"Updated demo","description":"","visibility":"unlisted","category":"Technology","tags":["demo","studio"],"thumbnailUrl":"https://example.com/thumbnail.jpg","renditions":[]}}
  ```
  Multipart edits validate the same fields and accept a JPEG/PNG/WebP `thumbnail` up to 10 MB, including file-only edits. Ownership is checked correctly for both raw and populated owner IDs. A different owner receives 403; a missing video receives 404; invalid bodies/IDs receive 400. Empty descriptions and empty tags clear their fields. Passwords, storage keys and queue details are excluded from video edit/upload responses.

- **DELETE `/video/:videoId`** (owner only): no body. Example: `DELETE /api/v1/video/cccccccccccccccccccccccc`. Response:
  ```json
  {"message":"Video deleted successfully"}
  ```
  Reuses the existing cleanup: delete `videos/<id>/hls/`, recorded raw object, stored thumbnail, master playlist and distinct legacy video object, then remove the video document. Ownership is checked before cleanup. **Limits:** stored-file deletion is best effort (the existing single-object helper logs and swallows S3 delete failures); prefix listing/batch failures can abort deletion. Queue jobs are not cancelled. An active encode may finish after cleanup and recreate files; its result listener ignores missing video documents. Comment documents, saved/history/playlist references, externally supplied thumbnail URLs and historical replaced thumbnails are not purged by this endpoint. No live S3 deletion was performed during implementation.

### Channel endpoints

- **GET `/channel/:channelId`** (public, optional JWT for viewer state): accepts an ObjectId or handle. Example: `GET /api/v1/channel/my_studio`. Response example:
  ```json
  {"channel":{"_id":"cccccccccccccccccccccccc","id":"cccccccccccccccccccccccc","name":"My studio","handle":"my_studio","description":"Videos from my studio","logoUrl":"https://example.com/avatar.png","avatarUrl":"https://example.com/avatar.png","bannerUrl":null,"subscriberCount":4,"subscribers":4,"videoCount":2,"totalVideos":2,"totalViews":12,"createdAt":"2026-11-13T00:00:00.000Z","isOwner":false,"isSubscribed":true,"viewer":{"isOwner":false,"isSubscribed":true}}}
  ```
  Owner email, owner object and storage IDs are never returned. Subscriber count uses users' actual subscriptions, including subscriptions through either existing API. Video count and total views include completed public videos only. Old channels without a handle expose a stable `c_<channelObjectId>` fallback, which also resolves as a handle. New channels receive that handle on creation; owners can rename it. A partial unique index enforces persisted handle uniqueness; conflicting handles and duplicate-key races return 409. Legacy missing visibility is treated as public, consistent with the existing catalogue.

- **GET `/channel/:channelId/videos`** (public): query `limit` (default 20, max 50), opaque `cursor`; completed public videos only. Example: `GET /api/v1/channel/my_studio/videos?limit=20`. Response example:
  ```json
  {"items":[],"videos":[],"nextCursor":null,"hasMore":false}
  ```
  Nonempty items include the video fields illustrated for `/video/me` and `channel: { id, name, avatarUrl }`. Existing card fields and the `videos` alias remain available. Invalid pagination returns 400; missing channels return 404. Route registration is consolidated in the channel module to avoid duplicating the existing catalogue routes.

- **PUT `/channel/me`** (authenticated owner): accepts `name` (3-50, nonblank), unique `handle` (3-30 lowercase `[a-z0-9_]`), `description` (max 1000, empty clears), HTTP(S) `avatarUrl` and `bannerUrl` (max 2048 each). Example request:
  ```json
  {"name":"My studio","handle":"my_studio","description":"Videos from my studio","avatarUrl":"https://example.com/avatar.png","bannerUrl":"https://example.com/banner.png"}
  ```
  Response example:
  ```json
  {"message":"Channel updated successfully","channel":{"_id":"cccccccccccccccccccccccc","id":"cccccccccccccccccccccccc","name":"My studio","handle":"my_studio","description":"Videos from my studio","logoUrl":"https://example.com/avatar.png","avatarUrl":"https://example.com/avatar.png","bannerUrl":"https://example.com/banner.png","subscribers":4,"createdAt":"2026-11-13T00:00:00.000Z"}}
  ```
  Avatar changes also update legacy `logoUrl`. No channel returns 404; name/handle conflicts return 409. Reserved fallback handles and existing ObjectIds cannot be claimed for another channel.

- **DELETE `/channel/me`** (authenticated owner): request `{"confirmHandle":"my_studio"}` must exactly match the current handle, including the fallback for old channels. Mismatch returns 400; missing channel returns 404. Response:
  ```json
  {"message":"Channel deleted successfully"}
  ```
  Makes **all** videos belonging to the channel owner private before deleting the channel, removes subscriptions to it and clears the owner's channel reference. Video records, assets, logo/banner files and transcode jobs remain. Processing completion changes status but leaves visibility private. A later channel created by the same owner can manage those retained videos. These database steps are ordered but are not a multi-document transaction; failures can leave partial cleanup and can be retried.

### User endpoints

- **PATCH `/user/me`** (authenticated): request example `{"displayName":"Raj Bhoyar","bio":"I make videos.","avatarUrl":"https://example.com/avatar.png"}`. `displayName` maps to the existing `name` field (3-50 characters, nonblank); bio max 1000, empty clears. The existing `name` alias (1-100 characters) and nullable avatar remain supported. If both names are supplied, `displayName` wins. Response example:
  ```json
  {"message":"Profile updated successfully","user":{"_id":"aaaaaaaaaaaaaaaaaaaaaaaa","name":"Raj Bhoyar","displayName":"Raj Bhoyar","email":"raj@example.com","phone":"9999999999","bio":"I make videos.","avatarUrl":"https://example.com/avatar.png","identityVerified":false,"hasChannel":false,"channelId":null,"channel":null,"createdNetworksCount":0,"memberNetworksCount":0}}
  ```
  Preserves the existing profile summary fields and adds displayName/bio. `GET /user/me` also includes these additions. Existing profile mutation registration is consolidated into the routes/controllers/services structure.

- **PUT `/user/me/password`** (authenticated): request `{"currentPassword":"old-password","newPassword":"new-password"}`. Wrong current password returns 401; new passwords require at least 6 characters, matching signup. Reuses bcrypt verification/hashing; stores only the new hash. Response:
  ```json
  {"message":"Password changed successfully"}
  ```
  Existing JWTs keep their normal expiry; password changes do not issue a new token or revoke other sessions.

- **DELETE `/user/me`** (authenticated): request `{"password":"current-password"}`. Wrong password returns 401. Response:
  ```json
  {"message":"Account deleted successfully"}
  ```
  Verifies the password before mutations, deletes the owned channel using the policy above (or directly makes videos private when no channel exists), removes personal saved videos, watch history, playlists, owned networks and other network memberships, then deletes the user. Authenticated routes now check that the JWT's account still exists; deleted-account tokens receive 401. Optional authentication treats them as anonymous. **Retained:** private video documents/assets/jobs, posted comments, reactions/view counters and external URLs; this is not a full data-erasure service. As with channel deletion, ordered database changes are not transactional and partial failures require retry.

### Reused endpoints and verification

Existing video initiation/completion/status/upload, single-video GET, like/dislike, channel creation/self lookup, user self lookup and both subscription route families remain registered. New channel fields are additive in create/self responses. Upload/complete/status response envelopes retain their existing fields; legacy queue-ID/progress/error slots in completion/status responses are redacted to null, and rendition storage-key slots in status are null, so job internals are not exposed. Progress polling should use the existing `videoStatus`/`status` fields. Existing protected routes continue to use JWT authentication.

No table endpoint remains unimplemented. Storage/job cleanup limitations are explicitly documented above, as allowed by the contract. `tests/creator-studio.test.js` covers services and Fastify injection with mocked persistence/storage; existing home tests are also run. No live MongoDB index creation, S3 operations, Redis jobs or credentialed upload flow was exercised. Production needs the declared unique handle index applied through normal Mongoose index management. No lint script/configuration is present in server/package.json. No client edits, destructive shell commands or commits were made.

Final checks: npm.cmd test passed all 22 tests; node --check passed for all 61 JavaScript files under src/tests/workers plus Server.js; git diff --check -- . passed. No lint task is configured.
