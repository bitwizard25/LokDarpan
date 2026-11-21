# LokDarpan story landing page Implementation Plan

> **For agentic workers:** Use the plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add a responsive `/story` page that explains LokDarpan's shared-content idea and links to the existing feed.

**Architecture:** Add one standalone Remix route that renders its own marketing page without the app's shared feed layout. Use local Tailwind classes and inline decorative elements, with no new packages or edits to existing routes.

**Tech Stack:** Remix, React, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-16-lokdarpan-story-landing-design.md`

## Global Constraints

- Keep the existing video feed and its interactions intact.
- Do not invent a founder anecdote, user numbers, launch dates, or playback capabilities.
- Do not replace the shared application shell or redesign existing routes.
- No dependencies or new global styles unless existing utility classes cannot express a needed detail.

## Review Focus

- The header and every call to action must resolve to existing routes (`/` and `/auth/signup`).
- The narrative must stay within the supplied idea of connection through shared content and the existing Theater concept.
- Narrow screens must keep the story visual and copy readable without horizontal overflow.
- The route must not invoke the feed loader or authentication requirements.
- Reduced motion must not be required to understand the story.

---

### Task 1: Build the standalone story route

**Files:**
- Create: `app/routes/story.tsx`

**Interfaces:**
- Produces Remix route `/story`; no loader, action, global stylesheet, or shared layout changes.

- [x] Add page metadata, a compact wordmark header, and a responsive story layout with narrative sections, an original CSS shared-screen illustration, and links to the existing feed and signup route.
- [x] Keep copy factual and use only existing Tailwind theme tokens and installed icon components if needed.
- [x] Review the diff to confirm no existing route or shared component changed and all links match the current route map.

**Verification:** `npm.cmd run typecheck` and `npm.cmd run build` pass. The route was reviewed in a local browser at desktop and 390 px mobile widths; mobile had no horizontal overflow. The production build still reports sourcemap-location notices in existing UI files and a chunk-size warning for the existing HLS player. No tests were added or run.
