# Design system — where to change what

A quick map for when you want to tamper with how the app looks. Most visual
changes only need to touch 1–2 files, listed below by what you're trying to do.

## "I want to change the brand color / green accent"
→ `tailwind.config.js` — the `colors.brand` block. `DEFAULT` is the main
green, `dark` is used for hovers/borders, `light` for soft backgrounds.
Every `bg-brand`, `text-brand`, `border-brand` class across the app updates
automatically.

## "I want to change room status colors" (the Dashboard grid)
→ `src/lib/theme.js` — `STATUS_CLASSES` (the room grid) and
`STATUS_CELL_CLASSES` (the compact Month View grid). Each status
(`occupied`, `vacant`, `maintenance`, `checkout`, `invalid-checkout`,
`extended`, `paid-today`) maps to a Tailwind class string. Edit the hex
values or swap to named Tailwind colors — both work.

## "I want to change booking source badge colors" (Trip.com, Walk-in, etc.)
→ `src/lib/theme.js` — `SRC_BADGE_CLASSES`. Every badge in the app
(Dashboard, RoomModal, BookingsPage) reads from this one map via the shared
`<Badge>` component, so editing it here changes every badge at once.

## "I want to change how buttons/action pills look" (Mark arrived, Extend
stay, Delete, etc. in RoomModal)
→ `src/lib/theme.js` — `PILL_VARIANTS` for colors, `PILL_BASE` for shared
sizing/shape (padding, rounding, font). Used via `<ActionPill variant="...">`
— see `src/components/ui/ActionPill.jsx`. Add a new variant name to
`PILL_VARIANTS` and it's instantly usable anywhere as
`<ActionPill variant="yourNewName">`.

## "I want to change form input styling" (text/date/number fields)
→ `src/lib/theme.js` — `INPUT_CLASS` (standard fields) and
`INPUT_CLASS_COMPACT` (narrow fields, used in Prices page rate tables).

## "I want to change modal styling" (popup dialogs)
→ `src/components/Modal.jsx` — every modal in the app (RoomModal,
BookingModal, Extend/Move popups) renders through this one component.

## "I want to change fonts"
→ `tailwind.config.js` — `fontFamily.sans` / `fontFamily.mono`.

## Reusable components (use these instead of hand-rolling markup)
- `<Badge source={booking.source} />` — booking source tag. `size="sm"` for
  compact contexts.
- `<ActionPill variant="green" onClick={...}>Label</ActionPill>` — rounded
  action button. Variants: `green`, `amber`, `blue`, `blueDark`, `gray`,
  `grayDark`, `red`, `redStrong`, `brand`, `brandSolid`.
- `<Modal>` — popup dialog shell with title/subtitle/close button.

## Philosophy
`src/lib/theme.js` is the single source of truth for color/style *decisions*.
Individual page files (`RoomModal.jsx`, `Dashboard.jsx`, etc.) should mostly
just reference tokens from there rather than hardcoding new color classes —
that's what keeps a future restyle to a few files instead of a search-and-
replace across the whole app. If you add a new recurring UI pattern (a new
kind of badge, a new button style), add it to `theme.js` first, then use it,
rather than hardcoding it inline.
