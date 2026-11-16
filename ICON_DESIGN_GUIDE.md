# LokDarpan — Custom Icon Design System

> A complete specification for designing and implementing a bespoke SVG icon set
> that matches LokDarpan's dark cinematic glass-morphism UI.
> **This file is the single source of truth for all icon work.**

---

## 1. Design Philosophy

LokDarpan is a premium video streaming platform. Its icons must feel like they
belong to a **cinematic entertainment brand** — not a generic SaaS tool.

**Core principles:**

| Principle | What it means in practice |
|---|---|
| **Cinematic weight** | Icons should feel like they have physical presence — not thin wireframes floating in space. Think Apple TV+, not Google Material. |
| **Optical precision** | Every icon is hand-tuned to a 24×24 grid. Curves are smooth, corners are deliberate, negative space is intentional. |
| **Brand DNA** | Rounded terminals, soft corners, and a slight warmth distinguish LokDarpan icons from every open-source set. |
| **Two-state personality** | Every icon has an `outline` (resting) state and a `filled` (active/selected) state. The transition between them should feel like the icon "lights up" — not just swaps shapes. |

**Anti-patterns — never do these:**

- ❌ Thin 1px strokes that vanish on dark backgrounds
- ❌ Sharp 90° corners on organic shapes (hearts, clouds, people)
- ❌ Perfectly geometric circles for heads/faces — add subtle humanity
- ❌ Overly detailed icons that become mud at 20px
- ❌ Mixing visual metaphors from different icon families

---

## 2. Grid & Geometry Spec

```
┌────────────────────────┐
│    2px padding zone     │
│  ┌──────────────────┐  │
│  │                  │  │
│  │   20×20 live     │  │
│  │   area           │  │
│  │                  │  │
│  └──────────────────┘  │
│                        │
└────────────────────────┘
        24 × 24
```

| Property | Value | Notes |
|---|---|---|
| **ViewBox** | `0 0 24 24` | Always. No exceptions. |
| **Live area** | 20×20 (2px inset) | All visual content stays inside. |
| **Stroke width** | `1.75px` | The signature weight. Not 1.5 (too thin on dark), not 2 (too heavy). |
| **Stroke linecap** | `round` | Always round. Never `butt` or `square`. |
| **Stroke linejoin** | `round` | Matches the rounded UI (rounded-3xl containers, rounded-xl nav items). |
| **Corner radius** | `1.5px – 2px` | On rectangular shapes. Matches the app's generous border-radius language. |
| **Optical sizing** | Export at `24`, render at `20–24` in UI | Sidebar: 24px. Mobile dock: 24px. Header actions: 18–20px. Inline text: 16px. |
| **Fill rule** | `evenodd` | For filled variants with internal cutouts. |

---

## 3. Color & State System

### 3.1 Icon never carries its own color

All icons use `currentColor` via `stroke="currentColor"` or `fill="currentColor"`.
Color is always inherited from the parent's Tailwind text class. This lets the
same SVG work in the sidebar, header, mobile dock, video player, and shorts
action bar without modification.

### 3.2 Three visual states

| State | Style | Tailwind color in context |
|---|---|---|
| **Rest** | Outline only. `stroke="currentColor"`, `fill="none"`, strokeWidth `1.75` | `text-dark-400` (#A1A1AA) |
| **Hover** | Same outline, parent transitions color | `text-white` |
| **Active / Selected** | Filled variant. `fill="currentColor"`, no stroke (or stroke matches fill) | `text-white` with optional `text-primary-400` (#60a5fa) accent |

### 3.3 Active indicator bar (Sidebar)

The sidebar already paints a `3px` rounded primary-500 bar on the left edge of
the active item. The icon's job is only to switch from outline → filled. Do NOT
add color to the icon itself in the active state — the bar handles brand accent.

### 3.4 Special states

| Context | Treatment |
|---|---|
| **Shorts action button (liked)** | Filled heart, parent bg turns `bg-red-500` |
| **Video card "Watch Later" added** | Icon swaps from `Plus` → `Check` (filled) |
| **Mobile dock active** | Filled variant, parent applies `text-white` |
| **Disabled / unavailable** | Outline at `text-dark-600` (#52525B), 50% opacity |

---

## 4. The Icon Catalog

### 4.1 Navigation (Sidebar + Mobile Dock)

These are the most-seen icons. They must be instantly recognizable at 24px on a
near-black background with a `1.75px` stroke.

| Icon name | Visual concept | Outline description | Filled description |
|---|---|---|---|
| `Home` | House with a chimney-less modern roofline | Angled roofline meeting at center peak, rectangular body below with a vertical center door. Rounded corners on the body. | Same shape, body and roof fully filled. Door remains as negative-space cutout (evenodd). |
| `Explore` | Compass rose | Circle with a diamond/rhombus pointer inside, rotated 45°. The pointer has two halves — top-right filled, bottom-left open (like a real compass needle). | Full circle filled, compass needle as negative space. |
| `Trending` | Flame or rising arrow | An upward-curving arrow with a slight flame-like organic curve at the tip. NOT a straight diagonal — it should feel alive. | Arrow body filled solid. |
| `Shorts` | Play button inside a vertical phone frame | Rounded-rect phone outline (portrait, ~10×16 proportioned within the grid). Small centered right-pointing triangle inside. | Phone frame filled, triangle as negative cutout. |
| `Following` | Two overlapping people silhouettes | Front person: head circle + shoulder arc. Back person: same, offset right and slightly smaller, partially occluded. | Both silhouettes filled solid. Back one at slight transparency or just behind front. |
| `Library` | Stacked horizontal bookmark/playlist bars | Three horizontal rounded-rect bars, slightly offset like a deck of cards fanned. Top bar shortest, bottom longest (or equal). | All three bars filled solid. |
| `Create / Upload` | Plus in a circle | Circle outline with a `+` cross inside. Stroke weight matches. | Filled circle, plus as negative cutout. |
| `Profile` | Person in circle | Circle outline, person silhouette (head circle + shoulders arc) centered inside. | Filled circle, person as negative cutout. |
| `Theater` | Old-style TV / cinema screen | Rounded-rect screen shape with two small "antenna" lines extending from top corners, slightly angled outward. Gives a retro-premium feel unique to LokDarpan. | Screen filled, antenna strokes remain. |

### 4.2 Header Actions

| Icon name | Visual concept | Notes |
|---|---|---|
| `Search` | Magnifying glass | Circle + diagonal handle extending to bottom-right. Handle has rounded terminal. The circle should be optically centered, not mathematically — shift it ~0.5px up-left. |
| `Notifications` | Bell | Smooth bell curve, tiny clapper circle at bottom center. Notification dot state: add a small filled circle (4px) at top-right, colored via parent class. |
| `Menu` | Three horizontal bars | For mobile. Bars have rounded ends, 2px gap between each. Center bar 2px shorter than top/bottom for visual interest. |

### 4.3 Video Player Controls

These render on top of video content with semi-transparent backgrounds. They
must read clearly against any frame. Use `1.75px` stroke (same as all others).

| Icon name | Visual concept | Notes |
|---|---|---|
| `Play` | Right-pointing triangle | Equilateral triangle, rounded corners (~2px radius), optically centered (shift ~1px right to compensate for visual center vs geometric center). Filled always — no outline variant. |
| `Pause` | Two vertical bars | Two rounded-rect bars, `4px` wide each, `3px` gap. Filled always. |
| `SkipForward` | Two right-pointing triangles + vertical bar | Two small stacked triangles pointing right, followed by a thin vertical bar. |
| `SkipBack` | Mirror of SkipForward | Vertical bar + two left-pointing triangles. |
| `VolumeHigh` | Speaker + three sound waves | Speaker cone shape + three curved arcs radiating outward. |
| `VolumeMute` | Speaker + X | Speaker cone + two diagonal lines forming an X over the wave area. |
| `Fullscreen` | Four corner brackets | Four L-shaped corner pieces pointing outward. `1.75px` stroke, rounded joins. |
| `ExitFullscreen` | Four corner brackets pointing inward | Mirror of fullscreen. |
| `Settings / Gear` | Six-tooth gear | Smooth gear with 6 rounded teeth, inner circle cutout. NOT the 8-tooth busy gear — keep it clean. |
| `CaptionsCC` | Rounded rect with "CC" | Rounded rectangle outline with the letters "CC" inside, rendered as paths not text (so it scales without font dependency). |
| `PictureInPicture` | Large rect + small rect (corner) | Large screen outline, smaller filled rect in bottom-right corner. |
| `Speed` | Gauge / speedometer | Half-circle with a needle pointing to ~2 o'clock position. |

### 4.4 Shorts Action Bar

These are prominent — 24px icons inside 48px circular frosted-glass buttons on
a video background.

| Icon name | Visual concept | Notes |
|---|---|---|
| `Heart` | Anatomically inspired heart | NOT a perfect mathematical heart. Slightly asymmetric, left lobe just barely larger. This tiny imperfection makes it feel human and premium. Outline: `1.75px` stroke. Filled: solid fill, no stroke. |
| `Comment` | Speech bubble | Rounded rectangle with a small triangular tail at bottom-left. Tail points down-left. Three small horizontal lines inside (representing text). Filled: solid with lines as negative cutouts. |
| `Share` | Curved arrow (forward/send) | An arrow curving upward and to the right, originating from bottom-left. NOT the three-node "network share" shape — that looks corporate. This should feel like "sending" content outward. |
| `Bookmark` | Ribbon/flag | Tall narrow shape, pointed bottom (V notch). Classic bookmark silhouette. |
| `MoreVertical` | Three dots stacked vertically | Three filled circles, `4px` diameter each, `3px` gap, centered. |
| `Report / Flag` | Pennant flag | Flag on a vertical pole, flag waves slightly to the right. |

### 4.5 Bottom Sheet Menu (Mobile)

| Icon name | Visual concept |
|---|---|
| `Library` | Same as sidebar |
| `Clock` | Circle with two clock hands (hour at 10, minute at 12). Hands originate from center dot. |
| `Download` | Downward arrow entering a horizontal tray/line at the bottom. Arrow has a clean `1.75px` stroke. |
| `Settings` | Same gear as player settings |
| `Help` | Circle with a `?` inside. Question mark rendered as a path — the dot at the bottom is a small filled circle. |
| `SignOut` | Right-pointing arrow exiting a rectangle (door). |

### 4.6 Explore Category Icons

These render at both `24px` (card label) and `128px` (faded background
watermark). They must hold up at both sizes.

| Icon name | Visual concept |
|---|---|
| `Music` | Eighth note (single) — circle notehead + ascending stem + flag. |
| `Gaming` | Game controller — horizontally oriented, D-pad on left, two buttons on right, slightly rounded body. |
| `News` | Newspaper — folded corner on top-right, three lines of "text" on left, small "image" rectangle on right. |
| `Film` | Film strip — vertical strip with sprocket holes on both edges, two frames in the center. |
| `Learning` | Graduation cap — diamond-shaped mortar board, tassel hanging to one side. |
| `Live` | Video camera — body is a rounded rect, lens is a truncated triangle extending to the right. Small red "record" dot optional. |
| `Sports` | Trophy cup — U-shaped cup body, two handles, small pedestal base. |
| `Fashion` | Shopping bag — bag body with two short handle arcs at top. |
| `Tech` | CPU chip — square with small notches/pins on all four edges, inner square or circuit pattern. |
| `Comedy` | Smiley face — circle, two dot eyes, upward curved mouth arc. Friendly, not manic. |
| `Travel` | Globe — circle with two latitude lines and one longitude arc. |
| `Beauty` | Sparkle — three four-pointed stars, one large, two small, asymmetrically placed. |

---

## 5. React Component Architecture

### 5.1 File structure

```
client/app/components/icons/
├── index.ts              ← Re-exports everything
├── types.ts              ← Shared types
├── Home.tsx
├── Explore.tsx
├── Trending.tsx
├── Shorts.tsx
├── Following.tsx
├── Library.tsx
├── CreateUpload.tsx
├── Profile.tsx
├── Theater.tsx
├── Search.tsx
├── Notifications.tsx
├── Menu.tsx
├── Play.tsx
├── Pause.tsx
├── SkipForward.tsx
├── SkipBack.tsx
├── VolumeHigh.tsx
├── VolumeMute.tsx
├── Fullscreen.tsx
├── ExitFullscreen.tsx
├── SettingsGear.tsx
├── CaptionsCC.tsx
├── PictureInPicture.tsx
├── Speed.tsx
├── Heart.tsx
├── Comment.tsx
├── Share.tsx
├── Bookmark.tsx
├── MoreVertical.tsx
├── Flag.tsx
├── Clock.tsx
├── Download.tsx
├── Help.tsx
├── SignOut.tsx
├── Music.tsx
├── Gaming.tsx
├── News.tsx
├── Film.tsx
├── Learning.tsx
├── LiveCamera.tsx
├── Sports.tsx
├── Fashion.tsx
├── TechChip.tsx
├── Comedy.tsx
├── Travel.tsx
├── Beauty.tsx
├── ChevronLeft.tsx
├── ChevronRight.tsx
├── Check.tsx
├── Plus.tsx
└── X.tsx
```

### 5.2 Shared types (`types.ts`)

```ts
export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Pixel size (width & height). Default: 24 */
  size?: number;
  /** "outline" for resting, "filled" for active/selected */
  variant?: "outline" | "filled";
}
```

### 5.3 Component template (every icon follows this exactly)

```tsx
import type { IconProps } from "./types";

export function Home({ size = 24, variant = "outline", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {variant === "outline" ? (
        {/* Outline paths: stroke="currentColor" strokeWidth={1.75} fill="none" */}
      ) : (
        {/* Filled paths: fill="currentColor" stroke="none" */}
      )}
    </svg>
  );
}
```

### 5.4 Rules for the component

1. **Always set `aria-hidden="true"`** — icons are decorative; labels come from the parent.
2. **Spread `...props` on the `<svg>`** so consumers can add `className`, `onClick`, `style`, etc.
3. **Default `size={24}`**, but allow any number.
4. **`fill="none"` on the SVG root** — individual paths set their own fill/stroke.
5. **Every `<path>` and `<circle>` uses `currentColor`** — never a hardcoded hex.
6. **No `<title>` or `<desc>` inside the SVG** — the parent handles accessibility.
7. **Export from `index.ts`** as named exports: `export { Home } from "./Home";`

### 5.5 How to use in the app (migration examples)

**Sidebar (before):**
```tsx
import { House } from "@phosphor-icons/react";
<House size={24} weight={isActive ? "duotone" : "light"} />
```

**Sidebar (after):**
```tsx
import { Home } from "~/components/icons";
<Home size={24} variant={isActive ? "filled" : "outline"} />
```

**Shorts action button (before):**
```tsx
<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36..." />
</svg>
```

**Shorts action button (after):**
```tsx
import { Heart } from "~/components/icons";
<Heart size={24} variant={isLiked ? "filled" : "outline"} />
```

---

## 6. SVG Path Quality Rules

When drawing paths, adhere to these rules for a premium result:

1. **Use relative commands** (`m`, `l`, `c`, `a`) where possible — they compress better.
2. **Prefer cubic Béziers (`c` / `C`) over quadratic (`q` / `Q`)** — they produce smoother curves with fewer control points.
3. **Round coordinates to 2 decimal places** — `M12 3.5` not `M12 3.4999999`.
4. **Keep path count minimal** — combine shapes into a single `<path>` where possible using the `evenodd` fill-rule for cutouts. Two paths maximum per icon variant.
5. **Test at 16px, 20px, 24px, and 48px** — the icon must be crisp at all sizes without anti-aliasing artifacts.
6. **Align key vertices to the pixel grid** — horizontal/vertical edges on integer or half-pixel coordinates prevent subpixel blur.

---

## 7. Visual Differentiation from Open-Source Sets

What makes these icons recognizably "LokDarpan" vs Lucide/Phosphor/Heroicons:

| Trait | Open-source sets | LokDarpan custom |
|---|---|---|
| **Stroke width** | 1.5px (Lucide) or 2px (Heroicons) | 1.75px — the in-between sweet spot for dark UIs |
| **Corner character** | Fully rounded or fully sharp | Softly rounded (1.5–2px radius) — feels intentional, not default |
| **Terminal caps** | Round (Lucide) or butt (Material) | Always round — matches the `rounded-3xl` container language |
| **Fill style** | Simple solid fill | Solid fill with strategic negative-space cutouts (doors, windows, text lines) that add detail without complexity |
| **Heart shape** | Mathematically symmetric | Subtly asymmetric — left lobe slightly larger. Feels human. |
| **House icon** | Generic gable roof | Modern flat-ish roofline with a slight angle — matches a streaming platform's contemporary feel |
| **Compass icon** | Cardinal NSEW lines | Clean diamond pointer with two-tone halves — more elegant, less "Google Maps" |

---

## 8. Implementation Checklist

After creating the icon components:

- [ ] Delete `@phosphor-icons/react` from `package.json`
- [ ] Delete `lucide-react` from `package.json` (replace the 4 uses in shadcn/ui components: `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `sheet.tsx`)
- [ ] Run `npm install` to clean up `node_modules`
- [ ] Search for all `@phosphor-icons` and `lucide-react` imports — zero results
- [ ] Verify sidebar active/inactive states render correctly
- [ ] Verify mobile dock icons match sidebar icons
- [ ] Verify shorts action buttons (heart fill toggle, comment, share)
- [ ] Verify explore category icons at both 24px and 128px
- [ ] Verify video player controls on a playing video
- [ ] Verify bottom sheet menu icons
- [ ] Run `npm run build` — no errors, bundle size should decrease (removed two icon libraries)

---

## 9. Bundle Size Benefit

| Before | After |
|---|---|
| `@phosphor-icons/react` — ~180KB (even tree-shaken, loads the weight system + duotone renderer) | Custom icons — ~15–25KB total (pure SVG paths, zero runtime) |
| `lucide-react` — ~50KB tree-shaken | Eliminated — only 4 icons were used (X, Check, ChevronRight, Circle) |
| **~230KB of icon runtime** | **~20KB of static SVG** |

---

*This guide is complete. Hand this file to the implementing agent and let it build each icon component following the spec above.*

