# LokDarpan: page-wise API creation plan

## Purpose and scope

Planning document only. This describes the APIs needed by the current client and the user/network requirements discussed with the owner. Endpoint names below are proposed contracts, not a claim that they are implemented or working. All paths use the `/api/v1` prefix. No application code is included.

Reviewed on 8 November 2026 through the running client and route/component source. Browser-accessible pages were visited without signing in or submitting forms. Profile, Upload, and Create Channel redirected to login; their requirements below come from source inspection. Network screens are planned and are not present in the current UI.

## UI findings

| Page | Current observation |
| --- | --- |
| Home `/` | Featured hero, category chips, Trending Now, Shorts, coding/technology row, and My List controls. Content is hardcoded. |
| Explore `/explore` | Category tiles link to Trending with a category query. |
| Trending `/trending` | Featured first-ranked video and ranked video list with sample statistics. |
| Shorts `/shorts` | Vertical sample-video feed with engagement controls. |
| Following `/following` | Coming Soon placeholder. |
| Library `/library` | Sample history and playlists, uploads/settings shortcuts. |
| Login and Signup | Forms load. Authentication was not submitted or verified. |
| Profile, Create Channel, Upload | Require login; inspected in source only. |
| Channel `/channel/demo` | Sample channel profile and videos load. |
| Watch `/watch/t1` | Returned HTTP 500 during this inspection; cause not established here. Two dynamic watch route source files also need consolidation during implementation. |
| Search `/search?q=test` | Returned HTTP 404; header search currently points here. |
| Networks | Requested product feature; screens still need to be defined. |

## Shared contracts and rules

- Public reads work for guests. An authenticated viewer may receive their saved, subscribed, or reaction state. Account data and all personal mutations require authentication.
- Use stable IDs or unique handles for links. Channel display names must not be identifiers.
- Video card data: ID, title, thumbnail URL, duration in seconds, published timestamp, view count, content type, channel ID/name/avatar, and optional viewer saved state. Full playback data belongs to the watch endpoint.
- Lists accept a bounded limit and an opaque cursor, and return items, next cursor, and whether more results exist. Home sections have independent cursors. No pagination result should expose private records.
- Public feeds contain published, playable content only. Uploading, failed, unpublished, or restricted content is visible only to authorized users.
- Counts are numbers; timestamps are consistent ISO date-time strings. The client formats durations, dates, and counts for display.
- Errors provide a stable error code, readable message, and field errors where relevant. Distinguish invalid input, unauthenticated, forbidden, missing resource, conflict, and service failure.
- Never return passwords, password hashes, internal storage keys, raw job details, or another person's private contact details.
- Empty lists are valid. Show empty, loading, and failure states instead of invented sample content.
- Play/pause, mute, fullscreen, sidebar collapse, and More Info expansion are client interactions and do not need separate APIs.

## 1. Home `/`

### GET `/home`

Purpose: load the featured content, category chips, and initial rows in one request. Accept optional category ID and language plus a bounded number of items per section. Guests receive a public feed; signed-in users may receive viewer-specific state. A first version can use curated or recent content for For You; personalization must not be implied until implemented.

Returns: optional featured video, available category IDs/labels, active category, and sections containing ID, title, video/short type, card items, next cursor, and has-more state. Featured data includes video ID, title, description, artwork, channel identity, and optional language/presenters where actually recorded. Allow no featured item when the catalogue is empty.

The hero currently always displays LIVE. A real response must distinguish recorded content from live content. Concurrent viewers and total views are different values. Live streaming and live viewer counts are a separate capability; do not fabricate them for uploaded videos.

### GET `/video`

Purpose: retrieve more items for a home row or its See All destination. Accept section ID, category, content type, cursor, and limit. Return video cards and pagination. Section IDs must be supported server-defined values, rather than arbitrary database queries.

### PUT / DELETE `/user/me/saved-videos/:videoId`

Purpose: persist Add to My List and Remove from My List. Login required. Accept the video ID in the path; return its resulting saved state. Repeating an action should preserve the same state without duplicate entries. Guests should be directed to login.

## 2. Shared header and navigation

### GET `/user/me`

Purpose: supply the account avatar/name, channel availability, and personal summary across pages. Login required. Return user ID, name, email/phone for the account owner, avatar, channel ID or null, derived has-channel value, and separate created-network and joined-network counts. Detailed network lists can be loaded separately.

Navigation links do not need individual APIs. The Create link uses the user's channel/application state to choose the appropriate upload or application page. Do not expose an authentication token just to render the header.

## 3. Search `/search` — route missing

### GET `/search`

Purpose: search the catalogue from the header. Accept query text, type filter (videos, channels, or all), category where applicable, cursor, and limit. Return matching video cards and public channel summaries with pagination. Distinguish sections or paginate each result type independently.

Only search public, permitted content. Do not advertise live results until live streaming exists. Search suggestions can be deferred; the current UI needs submitted search first.

## 4. Explore `/explore`

### GET `/categories`

Purpose: populate category tiles and keep category IDs consistent with Home and Upload. Return ID, label, optional description and icon key. Counts are optional and must be real if supplied. Colours and layout may remain client-owned.

Selecting a category loads the shared video-list API with its category ID. No separate API is needed for each category tile.

## 5. Trending `/trending`

### GET `/video?section=trending`

Purpose: supply the ranked list and its first-ranked hero. Accept optional category, supported time window, cursor, and limit. Return ranked card items, description, channel summary, and pagination. Include the ranking window or generation timestamp so the UI can describe the result accurately.

Define ranking during implementation, such as views during a documented window. Lifetime views alone do not establish what is popular today. Subscriber counts and publication times must come from real records. Watch Now links to the selected video's watch page and needs no mutation API.

## 6. Shorts `/shorts`

### GET `/video?type=short`

Purpose: provide the vertical feed. Accept cursor, limit, and optionally a starting short ID for deep links. Return playable short IDs, titles, playback URL or playback reference, duration, channel summary, likes, comment counts, viewer reaction, and pagination.

Use the shared watch/reaction/comment/view APIs below for each short. A reliable short content-type field is needed; duration alone must not silently classify existing videos. The homepage currently links to `/shorts/:id`, but only `/shorts` exists in the route inventory; implement a consistent deep-link destination when wiring the UI.

## 7. Watch `/watch/:videoId`

### GET `/video/:videoId`

Purpose: load video metadata and authorized playback. Return title, description, thumbnail, playback URL/HLS master, available renditions, duration, publication date, category, tags, views, reaction counts, comment count, channel identity/subscriber count, and viewer saved/subscribed/reaction states where logged in.

Guests can watch public published videos. Owners may see a processing state instead of playback. Reject unauthorized private content without exposing storage details. A metadata read must not automatically count as a watch.

### PUT / DELETE `/video/:videoId/reaction`

Purpose: set like/dislike or clear the viewer's reaction. Login required. PUT accepts the desired reaction. Return the viewer's resulting reaction and both updated counts. One viewer has at most one reaction; switching clears the previous one. This proposed explicit-state contract replaces ambiguous retries of toggle-style operations; existing like/dislike endpoints need a compatibility decision.

### GET / POST `/comment/:videoId/comments`

GET loads paginated comments: ID, author public ID/name/avatar, text, created/updated timestamps, and whether the viewer may edit/delete. POST requires login and accepts comment text, returning the created comment. Validate length and reject blank text.

### PUT / DELETE `/comment/:commentId`

Purpose: edit or remove the authenticated author's comment. PUT accepts replacement text and returns the updated comment; DELETE returns confirmation. Enforce ownership on the server and update visible counts consistently.

### POST `/video/:videoId/views`

Purpose: record a qualifying playback event. Accept a bounded watched duration/event identifier and return acknowledgement. Define qualification and deduplication rules during implementation; page refreshes and repeated retries must not inflate views. Guest viewing needs an anonymous deduplication strategy.

### GET `/video/:videoId/related`

Purpose: fill the watch-page recommendation column with permitted video cards. Accept cursor/limit, exclude the current video, and return pagination.

Subscribe and Save reuse the channel and library APIs. Share can use the browser share/clipboard functionality and the canonical URL. Theater rooms, guest lists, AI answers, and semantic chapters shown in experimental watch components are deferred capabilities; their presence in mock UI does not establish backend support.

## 8. Public channel `/channel/:channelId`

### GET `/channel/:channelId`

Purpose: load the channel profile and About tab. Return ID, unique handle if supported, name, description, logo/banner, creation date, subscriber count, published-video count, total public views, and viewer ownership/subscription state. Do not expose owner contact details.

### GET `/channel/:channelId/videos`

Purpose: fill the channel Videos tab. Accept type, supported sort, cursor, and limit. Return published video cards and pagination. Owner-only drafts and processing uploads belong to the creator view.

### PUT / DELETE `/user/me/subscriptions/:channelId`

Purpose: subscribe/unsubscribe with explicit final state. Login required. Return subscribed state and current subscriber count. Reject self-subscription and avoid duplicate subscriptions or negative counts. Existing `/user/:channelId/subscribe` and `/unsubscribe` paths need migration or reuse decided during implementation, not duplicate storage.

## 9. Following `/following` — placeholder UI

### GET `/user/me/subscriptions`

Purpose: show subscribed channels. Login required. Return paginated public channel summaries and current subscription states.

### GET `/user/me/following-feed`

Purpose: show published videos from subscribed channels. Accept cursor, limit, and optional channel filter; return cards and pagination. Show a clear empty state if no channels are followed. Joining a personal network and subscribing to a creator channel are separate relationships.

## 10. Library `/library`

### GET `/user/me/library`

Purpose: load preview sections for watch history, saved videos, and playlists. Login required. Return recent items and counts/continuation information for each section. Do not return invented progress or playlist counts.

### GET / PUT `/user/me/history` and DELETE `/user/me/history/:videoId`

GET returns paginated recently watched cards with last-watched timestamp, position, duration, and derived progress. PUT accepts video ID and playback position to maintain resume history; it is separate from public view counting. DELETE removes that account's history entry. Resume writes should be throttled rather than sent every frame.

### GET `/user/me/saved-videos`

Purpose: retrieve My List with pagination. Reuse Home's save/remove mutations. Return permitted cards; define how unavailable/deleted saved videos appear without exposing private content.

### GET / POST `/user/me/playlists`

GET returns playlist ID, name, visibility, item count, artwork, and timestamps. POST accepts name and visibility and returns the created playlist. Login required.

### GET / PATCH / DELETE `/playlists/:playlistId`

Purpose: view, rename/change visibility, or delete a playlist. Reads respect visibility; mutations require ownership. Detail includes paginated video items. Deletion removes the playlist, not its videos.

### PUT / DELETE `/playlists/:playlistId/videos/:videoId`

Purpose: add/remove a video with ownership checks and duplicate prevention. Return membership state and updated item count. Playlist detail/history routes linked from Library will also need actual client pages.

## 11. User profile `/profile`

### GET / PATCH `/user/me`

GET supplies basic account details, channel status, and network summaries. PATCH accepts only editable basic details such as name/avatar; email or phone changes require a separately agreed verification flow. Return the updated safe profile. Password updates must never use this general profile endpoint.

Keep the user representation minimal: basic identity, optional channel reference, separate created-network and joined-network lists/counts. Created networks are owned by the person. Joined networks are owned by other people where membership is active; exclude owned networks from that second category. Counts must follow the same rule as lists. The preliminary backend counts currently need adjustment to match this distinction.

### GET `/user/me/channel-summary`

Purpose: populate creator statistics when the user has a channel. Return real subscriber count, video count, and total views, or a clear no-channel state. The current Profile UI uses sample creator metrics; ordinary users should instead see their account/network information.

### GET `/user/me/videos`

Purpose: list the owner's uploads, including processing/failed items. Accept status, cursor, and limit; return video metadata, safe status, and allowed actions. Login required. Keep raw job errors and internal storage keys out of the response.

## 12. Channel eligibility `/channel/create` — updated product decision

The user subsequently replaced manual review with DigiLocker Aadhaar verification. Successful server-verified DigiLocker identity verification is the intended prerequisite for creating a channel; there is no manual moderator approval step. Credentials are not yet available, so live integration is an external dependency. See `api-progress.md` for the current status. The application/reviewer proposal below is retained as superseded planning context, not an implementation requirement.

The replacement API contract will need an authenticated verification-start action, a registered provider callback that securely binds the provider result to the initiating account, and an authenticated verification-status read. Final payloads and provider validation depend on the approved DigiLocker requester/provider contract. None of these may accept a client-supplied verified boolean as proof. The channel creation endpoint must enforce verified eligibility on the server. No Aadhaar numbers or document contents belong in the basic user response.

The current client creates a channel directly. The requested product behaviour is an application followed by approval. This is a planned change, not a working approval flow.

### POST `/channel-applications`

Purpose: submit a creator application. Login required. Accept proposed name, description, logo reference/upload, and any agreed application fields. Return application ID, submitted values, pending status, and submission timestamp. Prevent an active channel owner or duplicate pending applicant from creating conflicting applications.

### GET `/user/me/channel-application`

Purpose: show no application, pending, approved, or rejected status. Return application details, public-facing review reason where applicable, and approved channel ID. An application must not grant upload permissions until approval.

Approval needs an authorized reviewer role and a review workflow. Reviewer endpoints/screens are outside the current client UI and must be specified before implementation. No automatic approval or moderator powers are assumed here.

## 13. Upload `/upload`

### POST `/video/initiate-upload`

Purpose: validate creator eligibility and metadata, then authorize a direct media upload. Accept title, description, category ID, tags, video/short type, filename, content type, and expected size. Return video ID, temporary upload URL, expiry, and required upload headers. Login and an eligible approved channel required under the proposed product model.

### PUT to the returned storage upload URL

Purpose: transfer media bytes directly to storage. This is a storage operation, not another API server route. Honour the returned content-type/header requirements and display transfer progress. Temporary authorization must be scoped to the intended upload.

### POST `/video/:videoId/complete-upload`

Purpose: verify the uploaded source exists and satisfies size/type expectations before starting processing. Owner only. Return accepted processing state. Repeated completion requests must not create duplicate work.

### GET `/video/:videoId/transcode-status`

Purpose: poll processing safely. Owner only. Return state, progress only if measurable, retry guidance, safe failure message, and watch URL when ready. Do not expose raw queue payloads or credentials. Stop polling at completion/failure and handle prolonged processing gracefully.

Thumbnail upload and metadata edits need one consistent contract, such as owner-only PATCH `/video/:videoId` with documented media handling. The existing multipart PUT route may be adapted rather than adding competing update paths. DELETE `/video/:videoId` removes an owner's video and associated media subject to the agreed deletion behaviour.

## 14. Login, Signup, Logout

### POST `/auth/signup`

Purpose: register a basic personal account. Accept name, email, phone, and password as currently collected. Return safe account details and the agreed authentication result. Handle invalid fields and duplicate identity consistently. Signup does not create a channel or network automatically.

### POST `/auth/login`

Purpose: authenticate with email/password and establish the Remix session. Return safe identity and the server-side authentication result. Avoid revealing whether a particular account exists in login errors. Return-to navigation must be restricted to valid local destinations.

### Logout through the Remix session action

Purpose: destroy the current client session. A backend logout endpoint is needed only if server-side token/session revocation is introduced; deleting a cookie alone does not revoke an independently valid bearer token. The current session mechanism must be reviewed before defining this contract. No refresh-token API is assumed.

## 15. Networks — planned screens

These satisfy the requested distinction between networks created by a user and networks they joined. Existing preliminary backend work is a starting point, not a complete invitation or membership system.

### GET `/user/me/networks?relation=created|joined`

Purpose: load the two separate lists with matching counts. Login required. Return network ID/name/description, owner public summary, viewer role, active-member count, and pagination. Created means owner is the viewer. Joined means owner is someone else and viewer membership is active. Pending invitations appear separately.

### POST `/network`

Purpose: create a named network owned by the user. Accept name and optional description. Return network summary and owner role. Privacy/invitation policy needs agreement; default-private in preliminary work is an implementation proposal, not a confirmed product decision.

### GET / PATCH `/network/:networkId`

GET returns details only to permitted members/owner. PATCH lets authorized managers edit agreed fields. Return name, description, owner, membership/role, counts, and timestamps. Enforce permission checks server-side.

### GET `/network/:networkId/members`

Purpose: show paginated permitted member summaries and roles. Do not expose private email/phone by default. Pending invitees should not be presented as accepted members.

### POST `/network/:networkId/invitations`

Purpose: invite an existing user by ID under the agreed manager permissions. Return invitation ID, recipient public summary, status, and expiry if supported. Prevent duplicate invitations. External email/SMS invitation delivery is a separate capability and is not assumed.

### GET `/user/me/network-invitations`

Purpose: list the viewer's pending invitations with network summary, inviter, timestamps, and allowed actions.

### POST `/network-invitations/:invitationId/accept` or `/decline`

Purpose: let the intended recipient accept/decline. Return final invitation/membership state. Accept creates exactly one active membership; retries must not duplicate it. Users must never add themselves through another person's invitation.

### DELETE `/network/:networkId/members/me`

Purpose: leave a joined network. Return confirmation and update membership-derived counts. Owners cannot leave while retaining ownership; ownership transfer or deletion needs a separate agreed rule.

Family/friend relationship labels, individual friend requests, network messaging, and private video sharing remain future design decisions. Do not infer those features solely from membership in a network.

## Implementation sequence

1. Agree shared video/channel/user response fields and the created-versus-joined network distinction.
2. Home: aggregate feed, real categories/cards, filtering, empty/error states, and Save.
3. Search and Explore/Trending using the shared catalogue list contract.
4. Watch: correct route, real playback, channel links, reactions, comments, and recommendations.
5. Authentication/profile and channel eligibility/application state required for creator actions.
6. Upload and processing verification through actual permitted playback.
7. Channel, Following, Library, and Shorts integration.
8. Network lists, creation, invitations, and membership screens after their product rules are settled.

Finish and verify each page's actual user flow before proceeding. This document authorizes no deployment, external messages, or further application-code changes.
