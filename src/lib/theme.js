// ════════════════════════════════════════════════════════════════
//  DESIGN TOKENS
//  This file is the single source of truth for colors, badges, and
//  reusable style strings used across the app. If you want to change
//  how something LOOKS (not how it behaves), this is almost always
//  the right place to start — see DESIGN.md for the full guide.
// ════════════════════════════════════════════════════════════════

// ── Room / booking status colors ──────────────────────────────────
// Used on the Dashboard room grid. Each status maps to a background,
// border, and text color. `paid-today` is a special case layered on
// top of 'occupied' when today's payment has been logged.
export const STATUS_CLASSES = {
  occupied:            'bg-[#1a7a4a] border-[#0d3d22] text-white',
  vacant:               'bg-white border-[#a7d7bc] text-gray-400',
  checkout:             'bg-[#1d4ed8] border-[#1e3a8a] text-white',
  'invalid-checkout':   'bg-[#dc2626] border-[#7f1d1d] text-white',
  extended:             'bg-[#d97706] border-[#92400e] text-white',
  'extended-alt':       'bg-[#15803d] border-[#14532d] text-white',
  maintenance:          'bg-[#374151] border-[#1c2128] text-white',
  'paid-today':         'bg-[#60a5fa] border-[#2563eb] text-white',
}

// Same statuses, but as flat/borderless cells for the compact Month
// View grid. Kept separate because that view intentionally drops
// borders for a denser look — but it should stay in sync with the
// palette above, so edit both together if you change a status color.
export const STATUS_CELL_CLASSES = {
  occupied:             'bg-[#1a7a4a] text-white',
  checkout:              'bg-[#1d4ed8] text-white',
  'invalid-checkout':    'bg-[#dc2626] text-white',
  extended:              'bg-[#d97706] text-white',
  'extended-alt':        'bg-[#15803d] text-white',
  'paid-today':          'bg-[#60a5fa] text-white',
  maintenance:           'bg-[#374151] text-white',
  vacant:                'bg-white text-gray-300',
}

// ── Booking source badges (Trip.com, Walk-in, Booking.com, etc.) ──
export const SRC_BADGE_CLASSES = {
  T:  'bg-blue-100 text-blue-700',
  W:  'bg-gray-100 text-gray-600',
  B:  'bg-indigo-100 text-indigo-700',
  AG: 'bg-red-100 text-red-700',
  EX: 'bg-amber-100 text-amber-700',
}

// ── Form inputs ─────────────────────────────────────────────────
// Standard text/number/date input. `INPUT_CLASS_COMPACT` is the
// narrower, monospace variant used for rate/number tables (Prices page).
export const INPUT_CLASS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'

export const INPUT_CLASS_COMPACT =
  'w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30'

// ── Action pill buttons ────────────────────────────────────────
// The small rounded action buttons used throughout RoomModal,
// BookingsPage, etc. ("Mark arrived", "Extend stay", "Delete"...).
// Add a new variant here and it's instantly available everywhere
// via <ActionPill variant="...">.
export const PILL_BASE = 'text-xs py-2 px-3 rounded-lg font-medium transition-colors'

export const PILL_VARIANTS = {
  green:     'bg-green-50 text-green-700 hover:bg-green-100',
  amber:     'bg-amber-50 text-amber-700 hover:bg-amber-100',
  blue:      'bg-blue-50 text-blue-700 hover:bg-blue-100',
  blueDark:  'bg-blue-50 text-blue-800 hover:bg-blue-100',
  gray:      'bg-gray-50 text-gray-600 hover:bg-gray-100',
  grayDark:  'bg-gray-50 text-gray-700 hover:bg-gray-100',
  red:       'bg-red-50 text-red-600 hover:bg-red-100',
  redStrong: 'bg-red-50 text-red-700 hover:bg-red-100',
  brand:     'bg-brand/10 text-brand hover:bg-brand/20',
  brandSolid:'bg-brand text-white hover:bg-brand-dark',
}
