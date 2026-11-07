# design-sync notes (LokDarpan)

- Source is an app, not a library: `client/ds-entry/` builds `client/ds-dist/` (vite lib + tsc d.ts + tailwind css). Re-run `sh ds-entry/build.sh` (from client/) before every sync (`cfg.buildCmd`). ds-dist/ is gitignored.
- `@remix-run/react` is aliased to `ds-entry/remix-shim.tsx` (Link->`<a>`, useLocation, useSubmit, Form) so components render without a router.
- `useAppStore` is exported from the entry so previews can set store state (AvatarStack needs `isTheaterMode: true`).
- Card templates force `body{background:#fff}`; the app's dark body bg never applies. Every authored preview wraps in a `Stage` div (`#09090B`) - keep doing this.
- Entry exports are hand-listed in `ds-entry/index.ts`: add new components there.
- Fonts (Outfit, Plus Jakarta Sans) come from a Google Fonts @import in app/tailwind.css ([FONT_REMOTE], informational).
- Dependencies: `npm ci` fails (lockfile missing optional platform deps); use `npm install` then `git checkout -- package-lock.json`.
- Playwright is installed in `.ds-sync/` only.

## Known source bugs (not fixed here)
- `ShortsSection` uses class `shorts-card` which is defined nowhere in the repo, so the carousel collapses (unstyled) in the app and in the preview. ShortsSection is left on the floor card until the CSS exists.
- `Sidebar` shows icons only (labels not visible in the default render).

## Re-sync risks
- Previews depend on dark `Stage` hex `#09090B` copied from tailwind `dark-950`.
- 12 components are floor cards (Header, Layout, CinematicHero, AIPanel, TheaterLobby, MobileDock, MobileBottomSheet, ChameleonCanvas, HlsPlayer, SemanticScrubber, ShortsSection, ...) - authorable later.
