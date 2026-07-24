import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { parseDate, fmtDate, peso, calcNights, applyDiscount } from '../lib/utils'

const VIEWS = ['day','week','month','year']

function bookingIncome(b, rooms, prices, addons, from, to) {
  const ci  = parseDate(b.checkin)
  const co  = parseDate(b.checkout)
  const start = ci < from ? from : ci
  const end   = co > to   ? to   : co
  if (start >= end) return 0
  const nights = Math.max(1, Math.round((end - start) / 864e5))
  const room = rooms.find(r => r.number === b.room_number)
  if (!room) return 0
  const baseRate  = prices[`${room.type}_${b.source}`] || 0
  const addonRate = (b.extra_head || 0) * (addons?.extraHead || 0) +
                    (b.extra_bed  || 0) * (addons?.extraBed  || 0) +
                    (b.breakfast  || 0) * (addons?.breakfast || 0)
  return applyDiscount((baseRate + addonRate) * nights, b)
}

function getPeriodRange(view, offset) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let from, to, label
  if (view === 'day') {
    const d = new Date(now); d.setDate(d.getDate() + offset)
    from = d; to = new Date(d); to.setDate(to.getDate() + 1)
    label = d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  } else if (view === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay() + offset * 7)
    from = d; to = new Date(d); to.setDate(to.getDate() + 7)
    const toLabel = new Date(to); toLabel.setDate(toLabel.getDate() - 1)
    label = `${d.toLocaleDateString('en-PH',{month:'short',day:'numeric'})} – ${toLabel.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}`
  } else if (view === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    from = d; to = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    label = d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  } else {
    const y = now.getFullYear() + offset
    from = new Date(y, 0, 1); to = new Date(y + 1, 0, 1)
    label = String(y)
  }
  return { from, to, label }
}

function buildBars(view, from, to, bookings, rooms, prices, addons) {
  const bars = []
  if (view === 'day') {
    // Hours 0–23
    for (let h = 0; h < 24; h++) {
      const hFrom = new Date(from); hFrom.setHours(h)
      const hTo   = new Date(from); hTo.setHours(h + 1)
      bars.push({ label: `${h}h`, value: 0 })
    }
    // simplify: day total only
    const total = bookings.reduce((s, b) => s + bookingIncome(b, rooms, prices, addons, from, to), 0)
    return [{ label: 'Today', value: total }]
  } else if (view === 'week') {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    for (let d = 0; d < 7; d++) {
      const df = new Date(from); df.setDate(df.getDate() + d)
      const dt = new Date(df); dt.setDate(dt.getDate() + 1)
      const val = bookings.reduce((s, b) => s + bookingIncome(b, rooms, prices, addons, df, dt), 0)
      bars.push({ label: days[df.getDay()], value: val })
    }
  } else if (view === 'month') {
    const daysInMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const df = new Date(from.getFullYear(), from.getMonth(), d)
      const dt = new Date(from.getFullYear(), from.getMonth(), d + 1)
      const val = bookings.reduce((s, b) => s + bookingIncome(b, rooms, prices, addons, df, dt), 0)
      bars.push({ label: String(d), value: val })
    }
  } else {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    for (let m = 0; m < 12; m++) {
      const df = new Date(from.getFullYear(), m, 1)
      const dt = new Date(from.getFullYear(), m + 1, 1)
      const val = bookings.reduce((s, b) => s + bookingIncome(b, rooms, prices, addons, df, dt), 0)
      bars.push({ label: months[m], value: val })
    }
  }
  return bars
}

const SRC_COLORS = { T:'bg-blue-500', W:'bg-gray-400', B:'bg-indigo-500', AG:'bg-red-500', EX:'bg-amber-500' }

export default function AnalyticsPage() {
  const { bookings, rooms, prices, addons } = useData()
  const [view, setView]     = useState('month')
  const [offset, setOffset] = useState(0)

  const { from, to, label } = useMemo(() => getPeriodRange(view, offset), [view, offset])

  const bars = useMemo(() => buildBars(view, from, to, bookings, rooms, prices, addons),
    [view, from, to, bookings, rooms, prices, addons])

  const total = useMemo(() =>
    bookings.reduce((s, b) => s + bookingIncome(b, rooms, prices, addons, from, to), 0),
    [bookings, rooms, prices, addons, from, to])

  const bySource = useMemo(() => {
    const map = {}
    bookings.forEach(b => {
      const inc = bookingIncome(b, rooms, prices, addons, from, to)
      if (inc > 0) map[b.source] = (map[b.source] || 0) + inc
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [bookings, rooms, prices, addons, from, to])

  const maxBar = Math.max(...bars.map(b => b.value), 1)

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button key={v} onClick={() => { setView(v); setOffset(0) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                view === v ? 'bg-brand text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-brand/40'
              }`}>{v}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(o => o - 1)} className="text-gray-400 hover:text-gray-700 px-2">←</button>
          <span className="text-sm font-semibold min-w-[180px] text-center">{label}</span>
          <button onClick={() => setOffset(o => o + 1)} className="text-gray-400 hover:text-gray-700 px-2">→</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total income</div>
          <div className="text-2xl font-extrabold text-brand">{peso(total)}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Bookings in period</div>
          <div className="text-2xl font-extrabold text-gray-900">
            {bookings.filter(b => parseDate(b.checkin) < to && parseDate(b.checkout) > from).length}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Top channel</div>
          <div className="text-2xl font-extrabold text-gray-900">
            {bySource[0] ? bySource[0][0] : '—'}
          </div>
          {bySource[0] && <div className="text-xs text-gray-400 mt-0.5">{peso(bySource[0][1])}</div>}
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Income by period</div>
        <div className="flex items-end gap-1 h-40">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
              <div className="relative w-full">
                <div
                  className="w-full bg-brand/80 hover:bg-brand rounded-sm transition-all duration-200"
                  style={{ height: `${Math.max(2, (bar.value / maxBar) * 120)}px` }}
                  title={peso(bar.value)}
                />
              </div>
              {bars.length <= 31 && (
                <div className="text-[9px] text-gray-400 truncate w-full text-center">{bar.label}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* By source */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Income by channel</div>
        {bySource.length === 0 ? (
          <div className="text-sm text-gray-400">No income in this period.</div>
        ) : bySource.map(([src, inc]) => (
          <div key={src} className="flex items-center gap-3 mb-2">
            <span className={`text-[10px] font-bold px-2 py-1 rounded ${
              src === 'T' ? 'bg-blue-100 text-blue-700' :
              src === 'W' ? 'bg-gray-100 text-gray-600' :
              src === 'B' ? 'bg-indigo-100 text-indigo-700' :
              src === 'AG' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            } w-16 text-center`}>{src}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${SRC_COLORS[src] || 'bg-gray-400'}`}
                style={{ width: `${(inc / total) * 100}%` }} />
            </div>
            <span className="text-sm font-mono font-semibold text-gray-700 w-24 text-right">{peso(inc)}</span>
            <span className="text-xs text-gray-400 w-10 text-right">{Math.round(inc / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
