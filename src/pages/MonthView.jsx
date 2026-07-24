import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { fmtDate, parseDate, shortDate, isInRangeInclusive, sortRoomKeys, srcLabel } from '../lib/utils'

const STATUS_CELL = {
  occupied:           'bg-[#1a7a4a] text-white',
  checkout:           'bg-[#1d4ed8] text-white',
  'invalid-checkout': 'bg-[#dc2626] text-white',
  extended:           'bg-[#d97706] text-white',
  'extended-alt':     'bg-[#15803d] text-white',
  'paid-today':       'bg-[#60a5fa] text-white',
  maintenance:        'bg-[#374151] text-white',
  vacant:             'bg-white text-gray-300',
}

function getCellStatus(booking, ds) {
  if (!booking) return 'vacant'
  if (booking.invalid_checkout && (booking.invalid_checkout_date ? ds >= booking.invalid_checkout_date : true)) return 'invalid-checkout'
  if (booking.checked_out && (booking.checked_out_date ? ds >= booking.checked_out_date : true)) return 'checkout'
  const exts = booking.extensions || []
  if (exts.length > 0) {
    const origCo = parseDate(exts[0].originalCheckout || booking.checkout)
    const d0 = parseDate(ds)
    if (d0 > origCo) {
      for (let ei = 0; ei < exts.length; ei++) {
        const prevEnd = ei === 0 ? origCo : parseDate(exts[ei - 1].checkout)
        const thisEnd = parseDate(exts[ei].checkout)
        if (d0 > prevEnd && d0 <= thisEnd) return ei % 2 === 0 ? 'extended' : 'extended-alt'
      }
    }
  }
  const paidToday = (booking.payments || []).some(p => p.date === ds)
  if (paidToday) return 'paid-today'
  return 'occupied'
}

export default function MonthView({ currentDate, onRoomClick }) {
  const { rooms, bookings } = useData()
  const [year, setYear]   = useState(currentDate.getFullYear())
  const [month, setMonth] = useState(currentDate.getMonth())

  const todayStr = fmtDate(currentDate)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const mStart = new Date(year, month, 1)
  const mEnd   = new Date(year, month + 1, 0)

  const shift = (d) => {
    let m = month + d, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y)
  }

  const monthLabel = mStart.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

  const sortedRooms = useMemo(() => sortRoomKeys(rooms.map(r => r.number)), [rooms])

  const monthBookings = useMemo(() =>
    bookings.filter(b => parseDate(b.checkin) <= mEnd && parseDate(b.checkout) >= mStart),
    [bookings, mStart, mEnd]
  )

  const days = useMemo(() => {
    const arr = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d)
      arr.push({
        d,
        ds: fmtDate(dt),
        name: dt.toLocaleDateString('en-PH', { weekday: 'short' }).slice(0, 1),
        isToday: fmtDate(dt) === todayStr,
        isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
      })
    }
    return arr
  }, [year, month, daysInMonth, todayStr])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">←</button>
          <span className="text-sm font-bold min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={() => shift(1)}  className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">→</button>
        </div>
        <button onClick={() => { setYear(currentDate.getFullYear()); setMonth(currentDate.getMonth()) }}
          className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:border-brand/40">
          This month
        </button>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 ml-auto flex-wrap">
          {[
            { color: '#1a7a4a', label: 'Occupied' },
            { color: '#60a5fa', label: 'Paid today' },
            { color: '#1d4ed8', label: 'Checkout' },
            { color: '#dc2626', label: 'Invalid' },
            { color: '#d97706', label: 'Extended' },
            { color: '#374151', label: 'Maint.' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-[11px]" style={{ minWidth: `${daysInMonth * 52 + 120}px` }}>
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="sticky left-0 z-20 bg-white border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-500 min-w-[110px]">Room</th>
              {days.map(({ d, ds, name, isToday, isWeekend }) => (
                <th key={d}
                  className={`border border-gray-200 px-0 py-1 text-center font-medium min-w-[48px]
                    ${isToday ? 'bg-brand text-white' : isWeekend ? 'bg-gray-50 text-gray-500' : 'text-gray-500'}`}>
                  <div className="text-[10px] leading-none">{d}</div>
                  <div className="text-[9px] opacity-70">{name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRooms.map(num => {
              const room = rooms.find(r => r.number === num)
              const roomBookings = monthBookings.filter(b => b.room_number === num)
              return (
                <tr key={num} className="hover:bg-gray-50/50">
                  <td
                    className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1.5 cursor-pointer hover:bg-brand/5"
                    onClick={() => onRoomClick?.(num)}
                  >
                    <div className="font-bold text-gray-900">Room {num}</div>
                    <div className="text-[9px] text-gray-400 leading-none mt-0.5">{room?.label}</div>
                  </td>
                  {days.map(({ d, ds, isToday }) => {
                    if (room?.status === 'maintenance') {
                      return (
                        <td key={d} className="border border-gray-200 bg-[#374151] p-0" title="Maintenance">
                          <div className="w-full h-7 flex items-center justify-center">
                            <span className="text-[9px] text-white/50">M</span>
                          </div>
                        </td>
                      )
                    }
                    const booking = roomBookings.find(b => isInRangeInclusive(parseDate(ds), b.checkin, b.checkout))
                    const status  = booking ? getCellStatus(booking, ds) : 'vacant'
                    const cellCls = STATUS_CELL[status] || STATUS_CELL.vacant
                    const isCI    = booking && ds === booking.checkin
                    const isCO    = booking && ds === booking.checkout

                    return (
                      <td key={d}
                        className={`border border-gray-100 p-0 cursor-pointer hover:opacity-80 transition-opacity
                          ${cellCls} ${isToday ? 'ring-2 ring-inset ring-white/50' : ''}`}
                        title={booking ? `${booking.guest} · ${srcLabel(booking.source)} · ${shortDate(booking.checkin)}–${shortDate(booking.checkout)}` : ''}
                        onClick={() => booking && onRoomClick?.(num)}
                      >
                        <div className="w-full h-7 px-0.5 flex items-center overflow-hidden relative">
                          {isCI  && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/60 rounded-r" />}
                          {isCO  && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/60 rounded-l" />}
                          {booking && (isCI || d === 1) && (
                            <span className="text-[9px] truncate leading-none font-medium pl-1">
                              {booking.guest.split(/[\s/]+/)[0].slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
