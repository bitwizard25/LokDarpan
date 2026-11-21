# LokDarpan story landing page

## Intent

Tell LokDarpan's story around the idea the founder supplied: staying connected while enjoying content together. Make the product's Theater experience the concrete expression of that idea, without claiming unverified features or invented company milestones.

## Goals

- Add a standalone, responsive story page with an emotional but plainspoken narrative.
- Use existing LokDarpan dark styling and the current Theater Lobby as product context.
- Give visitors a clear route to browse videos.

## Non-goals and anti-goals

- Keep the existing video feed and its interactions intact.
- Do not invent a founder anecdote, user numbers, launch dates, or playback capabilities.
- Do not replace the shared application shell or redesign existing routes.

## Approaches

- Replace `/` with a public marketing page and move the video feed: more visible, but changes the product's current front door and conflicts with in-progress home-route work.
- Add an isolated `/story` route: preserves the video feed and scopes changes to a new page. This is the recommended approach.

## Proposed design

Use a cinematic dark page with its own compact wordmark header, warm headline about sharing a moment through video, a human-centered shared-screen visual, and short sections that move from distance to the idea of watching together and then to Theater. Use the user's origin idea as the narrative seed, not as a fabricated founder anecdote. End with a link to the existing feed. Keep layout responsive and reuse installed icons and typography.

## Builder calls

- Route: `/story`; the home feed stays at `/`.
- Audience: people who want to feel connected through shared content (inferred from the user's description).
- Call to action: browse the video feed, since opening Theater requires first visiting a watch page.
- No dependencies or new global styles unless the existing utility classes cannot express a needed detail.

## Verification

Run the existing client typecheck and production build after implementation. Review the new route at desktop and mobile widths without disturbing the current working tree.
