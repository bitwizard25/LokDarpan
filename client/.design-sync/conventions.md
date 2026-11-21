# LokDarpan design system - conventions

LokDarpan is a dark, glassy video-discovery UI (Linear-style near-black, blue accent). Components are React; styling is **Tailwind utility classes plus a few named component classes** - there is no ThemeProvider and no CSS-in-JS. All styling ships in `styles.css` (which imports `_ds_bundle.css`); read those before styling anything.

## Setup (required)
- Load `styles.css`. It brings the tokens/utilities and the Outfit + Plus Jakarta Sans fonts (remote Google Fonts @import).
- There is **no provider**, but the page background is yours to set: wrap the app root in `<div className="bg-dark-950 text-dark-100 font-sans min-h-screen">`. Without it, white-on-dark components (KineticButton primary text, headings) vanish on a white page.
- Headings should use `font-display` (Outfit) and `text-white`; body text is `font-sans`.
- `Link`/`Form` inside components are plain anchors/forms here; routing is not wired.
- Components that read app state (`AvatarStack`, `GuestList`, `MobileDock`, `Header`) use the exported `useAppStore` (zustand). `AvatarStack` renders nothing until `useAppStore.setState({ isTheaterMode: true })`.

## Styling vocabulary (all verified in the compiled CSS)
- **Colors**: `dark-50..950` (neutrals; surfaces `bg-dark-950` page, `bg-dark-900` cards, `bg-dark-800` raised, text `text-dark-100/300/400`), `primary-50..950` + `primary-glow` (blue accent, `text-primary-400`, `bg-primary-500`), `accent-500` / `accent-glow` (amber, status). Use with `bg-`, `text-`, `border-`, `ring-`, `from-`, `to-`. Translucent white overlays are common: `bg-white/5`, `border-white/10`.
- **Named classes**: `glass-panel` (frosted surface), `lok-card` (content card), `nav-pill` (+ `.active`), `input-minimal` (text input), `btn-primary`, `btn-secondary`, `btn-ghost` (plain-CSS buttons), `text-gradient`, `spotlight-bg`, `scrollbar-hide`.
- **Shadows**: `shadow-minimal`, `shadow-minimal-hover`, `shadow-glow-subtle`, `shadow-glow-white`.
- **Motion**: `animate-fade-in`, `animate-slide-up`, `animate-shimmer`, `animate-bounce-elastic`.
- **Shape**: generous radii - `rounded-xl` cards, `rounded-3xl` glass panels, `rounded-full` buttons/chips.
- Prefer a library component over re-creating it with classes. Do not invent color names or hex values; use the tokens above.

## Where the truth lives
`styles.css` -> `_ds_bundle.css` (every class), `components/<group>/<Name>/<Name>.d.ts` (props) and `<Name>.prompt.md` (usage).

## Example
```jsx
const { GlassContainer, KineticButton, CategoryChips, VideoCard } = window.LokDarpan;
<div className="bg-dark-950 text-dark-100 font-sans min-h-screen p-8">
  <h1 className="font-display text-3xl font-bold text-white mb-4">Trending</h1>
  <CategoryChips categories={["All","Politics","Cricket","Music"]} activeCategory="All" />
  <div className="grid grid-cols-3 gap-6 mt-6">
    <VideoCard id="1" title="Monsoon Session recap" channelName="Lok Report" views={128400} createdAt="2026-11-01T10:00:00Z" duration={754} />
  </div>
  <GlassContainer className="mt-6"><KineticButton variant="primary">Start watch party</KineticButton></GlassContainer>
</div>
```

## Known gaps
`ShortsSection` depends on an undefined `shorts-card` class and renders collapsed - avoid it until the source defines that class.
