# Full System Readiness & Feature Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a verified production baseline for LokDarpan by configuring local/cloud database services, wiring all client pages to real APIs, resolving dead interactive controls, connecting skeleton loaders, and closing server route gaps.

**Architecture:** Remix v2 + Fastify modular REST API + MongoDB + Redis (BullMQ) + S3 (HLS Video Streaming). All client routes fetch data via Remix loaders and submit mutations via Remix actions using authenticated API clients (`~/lib/api.ts` and `getServerApiBaseUrl()`).

**Tech Stack:** React 18, Remix v2, TypeScript, Tailwind CSS, Fastify, Mongoose, Redis/ioredis, BullMQ, HLS.js.

---

## Global Constraints

- Never use `@phosphor-icons/react` or `lucide-react`; use bespoke icons from `client/app/components/icons`.
- All routes must handle both authenticated sessions and unauthenticated guests gracefully without crashing.
- SSR hydration safety: keep all dynamic timestamps or client-only elements protected against browser extension mismatches (`suppressHydrationWarning` on `root.tsx`).
- Preserve strict type safety (`npm run typecheck` must pass at every task boundary).

---

## Findings & Architecture Decisions

### 1. Watch Route Resolution
- **Decision:** `watch.$id.tsx` **stays**; `watch.$videoId.tsx` **stays deleted**.
- **Evidence:** `client/app/routes/watch.$id.tsx` contains the complete live API integration (`/video/:id`, `/comment/:videoId/comments`, `/user/me/saved-videos`, `/video/:id/reaction`), HLS player integration, channel subscriptions, and comment posting. All navigation links across cards, hero, and sidebar link to `/watch/${id}`.

### 2. Server Gaps Verified
- **Comment List Route:** Already exists at `GET /api/v1/comment/:videoId/comments` with cursor pagination.
- **Reaction Routes:** Already exist at `PUT /api/v1/video/:videoId/reaction` (`{ reaction: 'like' | 'dislike' }`) and `DELETE /api/v1/video/:videoId/reaction`.
- **DigiLocker / Verification:** Correctly stubbed with `503 VERIFICATION_NOT_CONFIGURED` at `/api/v1/user/me/identity-verification/start` pending external provider credentials.
- **Shorts Deep Linking:** Route `client/app/routes/shorts.$videoId.tsx` is already in place.

---

## Tasks

### Task 1: Environment & Database Configuration (.env, MongoDB, Redis)

**Files:**
- Create: `server/.env` (from `.env.docker.example` / requirements)
- Modify: `server/src/config/redis.js` (graceful fallback if Redis is optional in dev)
- Modify: `server/src/shared/messaging/transcodeQueues.js` (prevent startup crash if Redis is unavailable during frontend-only workflows)

**Interfaces:**
- Consumes: Environment variables (`MONGO_URI`, `DB_NAME`, `JWT_SECRET`, `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`)
- Produces: Live connection to MongoDB and Redis on server startup

- [ ] **Step 1: Create `server/.env` template**
  Configure `MONGO_URI`, `DB_NAME=lokdarpan`, `JWT_SECRET`, `PORT=5000`, `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`.
- [ ] **Step 2: Add graceful connection fallback in Redis config**
  Ensure the Fastify API can start and serve read/write requests even if the Redis worker queue is temporarily unavailable in local development.
- [ ] **Step 3: Verify server startup**
  Start `node Server.js` and verify it connects to MongoDB and logs `🚀 Server is running on http://0.0.0.0:5000`.

---

### Task 2: Wire Library Page to Real API & Implement Playlist Creation Modal

**Files:**
- Modify: `client/app/routes/library.tsx`
- Test: Verify `GET /user/me/library` and `POST /user/me/playlists`

**Interfaces:**
- Consumes: `GET /user/me/library`, `POST /user/me/playlists`
- Produces: Live watch history, real user playlists, and working `+` button with dialog

- [ ] **Step 1: Replace hardcoded mock history and playlists in `library.tsx` loader**
  Call `${base}/user/me/library` for authenticated users; fall back to empty state for guest users instead of dummy items.
- [ ] **Step 2: Connect the `+` new playlist button**
  Add a `Dialog` with a creation form (`name`, `visibility`) using `useFetcher` to submit to `POST /user/me/playlists`.
- [ ] **Step 3: Test and verify**
  Run `npm run typecheck` and test playlist creation and watch history display.

---

### Task 3: Missing Pages Validation & Routing (`/search`, `/history`, `/playlist/:id`, `/network`)

**Files:**
- Verify/Update: `client/app/routes/search.tsx`
- Verify/Update: `client/app/routes/history.tsx`
- Verify/Update: `client/app/routes/playlist.$playlistId.tsx`
- Verify/Update: `client/app/routes/network.tsx` & `client/app/routes/network.$networkId.tsx`

**Interfaces:**
- Consumes: `/search?q=...`, `/user/me/history`, `/playlists/:id`, `/network`
- Produces: 404-free navigation for all header search and library links

- [ ] **Step 1: Test `/search` route**
  Submit search query from `Header.tsx` search bar; verify results render using `VideoCard`.
- [ ] **Step 2: Test `/history` route**
  Verify watch history with "View All" link from Library page; ensure delete/clear actions work.
- [ ] **Step 3: Test `/playlist/:playlistId` route**
  Clicking any playlist tile opens the playlist details page with its videos.
- [ ] **Step 4: Verify typecheck on all newly activated routes**
  Run `cd client; npm run typecheck`.

---

### Task 4: Connect Skeleton Loaders to Transition States

**Files:**
- Modify: `client/app/routes/_index.tsx`
- Modify: `client/app/routes/trending.tsx`
- Modify: `client/app/routes/explore.tsx`
- Modify: `client/app/routes/search.tsx`
- Modify: `client/app/routes/history.tsx`

**Interfaces:**
- Consumes: `useNavigation().state !== 'idle'`
- Produces: Smooth skeleton placeholders (`VideoSkeleton`, `ShortsSkeleton`, `CategoryChipsSkeleton`) during page transitions

- [ ] **Step 1: Import skeletons in media routes**
  Import `VideoSkeleton` and `CategoryChipsSkeleton` from `~/components/VideoSkeleton/VideoSkeleton`.
- [ ] **Step 2: Wire loading condition**
  When `navigation.state === "loading"`, render skeleton grids to prevent sudden blank layout shifts.
- [ ] **Step 3: Test route transitions**
  Verify smooth visual feedback between Home, Trending, and Search.

---

### Task 5: Eliminate Hydration Warnings & Browser Extension Conflicts

**Files:**
- Modify: `client/app/root.tsx`

**Interfaces:**
- Consumes: `Layout` in `root.tsx`
- Produces: Clean console without `<meta>` mismatch warnings caused by browser extensions

- [ ] **Step 1: Add `suppressHydrationWarning` to `<html>`, `<head>`, and `<body>`**
  Prevents browser extensions (like copy unlockers, translators, dark mode extensions) from breaking React 18 hydration.
- [ ] **Step 2: Clean up duplicate viewport and charset tags**
  Ensure root and route meta configurations align seamlessly.
- [ ] **Step 3: Verify build and browser logs**
  Run `npm run build` and verify clean rendering.

