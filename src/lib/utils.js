// ── Date helpers ─────────────────────────────────────────────────────────────
export const fmtDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const parseDate = (s) => new Date(s + 'T00:00:00')

export const shortDate = (s) =>
  parseDate(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

export const dateLabel = (d) =>
  d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const isInRangeInclusive = (d, ci, co) => {
  const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return ds >= parseDate(ci).getTime() && ds <= parseDate(co).getTime()
}

export const isInRange = (d, ci, co) => {
  const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return ds >= parseDate(ci).getTime() && ds < parseDate(co).getTime()
}

export const bookingsOverlap = (ci1, co1, ci2, co2, coTime1 = '12:00', ciTime2 = '14:00') => {
  const t = (s) => parseDate(s).getTime()
  const [t1ci, t1co, t2ci, t2co] = [t(ci1), t(co1), t(ci2), t(co2)]
  if (t1co < t2ci || t2co < t1ci) return false
  if (t1co === t2ci) return coTime1 > ciTime2
  if (t2co === t1ci) return ciTime2 > coTime1
  return true
}

export const genId = () => 'b' + Date.now() + Math.random().toString(36).slice(2, 6)

export const nowTimestamp = () => {
  const d = new Date()
  return (
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + 'T' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0')
  )
}

export const fmtTimestamp = (ts) => {
  if (!ts) return null
  const d = new Date(ts)
  return (
    d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
  )
}

// ── Labels ───────────────────────────────────────────────────────────────────
export const srcLabel = (s) =>
  ({ T: 'Trip.com', W: 'Walk-in', B: 'Booking.com', AG: 'Agoda', EX: 'Expedia' }[s] || s)

export const srcShort = (s) =>
  ({ T: 'Trip', W: 'Walk-in', B: 'Bkg', AG: 'Agoda', EX: 'Expedia' }[s] || s)

export const typeLabel = (t) =>
  ({ standard: 'Standard Room', family2: 'Family Room (2 pax)', family3: 'Family Room (3 pax)' }[t] || t)

export const peso = (n) => '₱' + Math.round(n).toLocaleString()

// ── Room sorting ─────────────────────────────────────────────────────────────
export const sortRoomKeys = (keys) =>
  [...keys].sort((a, b) => {
    const an = /^\d+$/.test(a), bn = /^\d+$/.test(b)
    if (an && bn) return parseInt(a) - parseInt(b)
    if (an) return -1
    if (bn) return 1
    return a.localeCompare(b)
  })

// ── Floor grouping ───────────────────────────────────────────────────────────
export const groupByFloor = (roomNumbers) => {
  const map = {}
  sortRoomKeys(roomNumbers).forEach((r) => {
    let label
    if (/^\d+$/.test(r)) {
      const f = Math.floor(parseInt(r) / 100) * 100
      label = f === 100 ? 'Floor 1 (100s)' : f === 200 ? 'Floor 2 (200s)' : f === 300 ? 'Floor 3 (300s)' : `Floor (${f}s)`
    } else { label = 'Extended Rooms' }
    if (!map[label]) map[label] = []
    map[label].push(r)
  })
  return map
}

// ── Income calculations ───────────────────────────────────────────────────────
export const applyDiscount = (gross, booking) => {
  if (!booking || booking.discount_type === 'none' || !booking.discount_value) return gross
  if (booking.discount_type === 'percent') {
    const pct = Math.min(100, Math.max(0, parseFloat(booking.discount_value) || 0))
    return gross * (1 - pct / 100)
  }
  if (booking.discount_type === 'fixed') {
    return Math.max(0, gross - (parseFloat(booking.discount_value) || 0))
  }
  return gross
}

export const calcNights = (ci, co) =>
  Math.max(1, Math.round((parseDate(co) - parseDate(ci)) / 864e5))

export const bookingTotalDue = (booking, prices, addons) => {
  if (!booking || !prices) return 0
  const nights = calcNights(booking.checkin, booking.checkout)
  const priceKey = `${booking.room_type || 'standard'}_${booking.source}`
  // prices is { 'standard_T': 1500, ... }
  const baseRate = prices[priceKey] || 0
  const addonRate =
    (booking.extra_head || 0) * (addons?.extraHead || 0) +
    (booking.extra_bed || 0) * (addons?.extraBed || 0) +
    (booking.breakfast || 0) * (addons?.breakfast || 0)
  return applyDiscount((baseRate + addonRate) * nights, booking)
}

export const bookingAmountPaid = (booking) =>
  (booking.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)

export const bookingPaymentStatus = (booking, prices, addons) => {
  const paid = bookingAmountPaid(booking)
  const due = bookingTotalDue(booking, prices, addons)
  if (paid <= 0) return 'none'
  if (paid >= due) return 'full'
  return 'partial'
}

// ── Room status ───────────────────────────────────────────────────────────────
export const getRoomStatus = (room, booking, date, todayStr) => {
  if (!room) return 'vacant'
  if (room.status === 'maintenance') return 'maintenance'
  if (!booking) return 'vacant'
  const ds = todayStr || fmtDate(date || new Date())
  if (booking.invalid_checkout && (booking.invalid_checkout_date ? ds >= booking.invalid_checkout_date : true)) return 'invalid-checkout'
  if (booking.checked_out && (booking.checked_out_date ? ds >= booking.checked_out_date : true)) return 'checkout'
  const exts = booking.extensions || []
  if (exts.length > 0) {
    const origCo = parseDate(exts[0].originalCheckout || booking.checkout)
    const d0 = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : new Date(ds + 'T00:00:00')
    if (d0 > origCo) {
      for (let ei = 0; ei < exts.length; ei++) {
        const prevEnd = ei === 0 ? origCo : parseDate(exts[ei - 1].checkout)
        const thisEnd = parseDate(exts[ei].checkout)
        if (d0 > prevEnd && d0 <= thisEnd) return ei % 2 === 0 ? 'extended' : 'extended-alt'
      }
    }
  }
  return 'occupied'
}

export const STATUS_CLASSES = {
  occupied:          'bg-[#1a7a4a] border-[#0d3d22] text-white',
  vacant:            'bg-white border-[#a7d7bc] text-gray-400',
  checkout:          'bg-[#1d4ed8] border-[#1e3a8a] text-white',
  'invalid-checkout':'bg-[#dc2626] border-[#7f1d1d] text-white',
  extended:          'bg-[#d97706] border-[#92400e] text-white',
  'extended-alt':    'bg-[#15803d] border-[#14532d] text-white',
  maintenance:       'bg-[#374151] border-[#1c2128] text-white',
  'paid-today':      'bg-[#60a5fa] border-[#2563eb] text-white',
}

export const SRC_BADGE_CLASSES = {
  T:  'bg-blue-100 text-blue-700',
  W:  'bg-gray-100 text-gray-600',
  B:  'bg-indigo-100 text-indigo-700',
  AG: 'bg-red-100 text-red-700',
  EX: 'bg-amber-100 text-amber-700',
}
