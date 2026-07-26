import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { useToast } from '../components/Toast'
import {
  fmtDate, sortRoomKeys, groupByFloor,
  getRoomStatus, STATUS_CLASSES, SRC_BADGE_CLASSES,
  srcShort, peso, isInRangeInclusive,
  bookingTotalDue, bookingAmountPaid
} from '../lib/utils'
import RoomModal from './RoomModal'

const FILTER_OPTS = [
  { id: 'all',         label: 'All' },
  { id: 'occupied',    label: 'Occupied' },
  { id: 'vacant',      label: 'Vacant' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'no-deposit',  label: '🔑 No deposit' },
  { id: 'balance',     label: '💰 Balance due' },
]

const LEGEND = [
  { color: '#1a7a4a', border: '#0d3d22', label: 'Occupied' },
  { color: '#1d4ed8', border: '#1e3a8a', label: 'Checkout today' },
  { color: '#dc2626', border: '#7f1d1d', label: 'Invalid checkout' },
  { color: '#ffffff', border: '#a7d7bc', label: 'Vacant' },
  { color: '#d97706', border: '#92400e', label: 'Extended' },
  { color: '#15803d', border: '#14532d', label: 'Extended (alt)' },
  { color: '#60a5fa', border: '#2563eb', label: 'Paid today' },
  { color: '#374151', border: '#1c2128', label: 'Maintenance' },
]

export default function Dashboard({ currentDate, onAddBooking }) {
  const { rooms, bookings, prices, addons } = useData()
  const { toast } = useToast()
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [roomModal, setRoomModal] = useState(null)
  const [showBanner, setShowBanner] = useState(true)

  const todayStr = fmtDate(currentDate)
  const isToday  = todayStr === fmtDate(new Date())

  const bookingMap = useMemo(() => {
    const map = {}
    bookings.forEach(b => {
      if (isInRangeInclusive(currentDate, b.checkin, b.checkout)) {
        if (!map[b.room_number]) map[b.room_number] = b
      }
    })
    return map
  }, [bookings, todayStr])

  const getBookingOnDate = (roomNumber) => bookingMap[roomNumber] || null
  const getRoomObj       = (num) => rooms.find(r => r.number === num)

  // Today's activity
  const todayActivity = useMemo(() => {
    const checkIns  = bookings.filter(b => b.checkin  === todayStr)
    const checkOuts = bookings.filter(b => b.checkout === todayStr)
    return { checkIns, checkOuts }
  }, [bookings, todayStr])

  const stats = useMemo(() => {
    let occ = 0, vac = 0, maint = 0, noDeposit = 0, totalOwed = 0
    rooms.forEach(r => {
      const b = getBookingOnDate(r.number)
      const s = getRoomStatus(r, b, currentDate, todayStr)
      const isOcc = ['occupied','checkout','invalid-checkout','extended','extended-alt'].includes(s)
      if (isOcc) {
        occ++
        if (!b?.key_deposit) noDeposit++
        if (b) {
          const due  = bookingTotalDue({ ...b, room_type: r.type }, prices, addons)
          const paid = bookingAmountPaid(b)
          totalOwed += Math.max(0, due - paid)
        }
      }
      else if (s === 'vacant') vac++
      else maint++
    })
    const pct = rooms.length ? Math.round(occ / rooms.length * 100) : 0
    return { occ, vac, maint, noDeposit, pct, total: rooms.length, totalOwed }
  }, [rooms, bookings, prices, addons, todayStr])

  const floorMap = useMemo(() => groupByFloor(rooms.map(r => r.number)), [rooms])

  const filteredFloors = useMemo(() => {
    const result = {}
    const q = search.toLowerCase()
    for (const [floor, nums] of Object.entries(floorMap)) {
      const filtered = nums.filter(num => {
        const room = getRoomObj(num)
        const b    = getBookingOnDate(num)
        const s    = getRoomStatus(room, b, currentDate, todayStr)
        const isOcc = ['occupied','checkout','invalid-checkout','extended','extended-alt'].includes(s)
        if (filter === 'no-deposit') { if (!isOcc || b?.key_deposit) return false }
        else if (filter === 'balance') {
          if (!b) return false
          const due  = bookingTotalDue({ ...b, room_type: room?.type || 'standard' }, prices, addons)
          const paid = bookingAmountPaid(b)
          if (paid >= due) return false
        }
        else if (filter !== 'all') {
          if (filter === 'occupied' && !isOcc) return false
          else if (filter !== 'occupied' && s !== filter) return false
        }
        if (q) return num.toLowerCase().includes(q) || b?.guest?.toLowerCase().includes(q)
        return true
      })
      if (filtered.length) result[floor] = filtered
    }
    return result
  }, [floorMap, rooms, bookings, prices, addons, filter, search, todayStr])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 px-5 pt-4 pb-3">
        {[
          { label: 'Occupancy',      val: stats.pct + '%',       sub: `${stats.occ} of ${stats.total} rooms`, color: '' },
          { label: 'Occupied',       val: stats.occ,             sub: '',                                     color: 'text-blue-600' },
          { label: 'Vacant',         val: stats.vac,             sub: '',                                     color: 'text-brand' },
          { label: 'No key deposit', val: stats.noDeposit,       sub: `of ${stats.occ} occupied`,             color: 'text-red-500' },
          { label: 'Outstanding',    val: peso(stats.totalOwed), sub: 'balance owed',                         color: stats.totalOwed > 0 ? 'text-amber-600' : 'text-brand' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <div className="text-[11px] text-gray-500 font-medium">{s.label}</div>
            <div className={`text-xl font-extrabold mt-0.5 ${s.color}`}>{s.val}</div>
            {s.sub && <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Today's activity banner */}
      {isToday && showBanner && (todayActivity.checkIns.length > 0 || todayActivity.checkOuts.length > 0) && (
        <div className="mx-5 mb-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {todayActivity.checkIns.length > 0 && (
              <span className="flex items-center gap-1.5 text-green-700 font-medium">
                ✅ <strong>{todayActivity.checkIns.length}</strong> check-in{todayActivity.checkIns.length !== 1 ? 's' : ''} today
                <span className="text-green-500 text-xs">({todayActivity.checkIns.map(b => `Rm ${b.room_number}`).join(', ')})</span>
              </span>
            )}
            {todayActivity.checkOuts.length > 0 && (
              <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                🚪 <strong>{todayActivity.checkOuts.length}</strong> check-out{todayActivity.checkOuts.length !== 1 ? 's' : ''} today
                <span className="text-blue-500 text-xs">({todayActivity.checkOuts.map(b => `Rm ${b.room_number}`).join(', ')})</span>
              </span>
            )}
          </div>
          <button onClick={() => setShowBanner(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 px-5 pb-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Search guest or room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {FILTER_OPTS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
              filter === f.id
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand/40'
            }`}
          >{f.label}</button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap px-5 pb-2">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border" style={{ background: l.color, borderColor: l.border }} />
            <span className="text-[11px] text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Room grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {Object.entries(filteredFloors).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <div>No rooms match your filter.</div>
          </div>
        ) : Object.entries(filteredFloors).map(([floor, nums]) => (
          <div key={floor} className="mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">{floor}</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {nums.map(num => {
                const room     = getRoomObj(num)
                const b        = getBookingOnDate(num)
                const s        = getRoomStatus(room, b, currentDate, todayStr)
                const isOcc    = ['occupied','checkout','invalid-checkout','extended','extended-alt'].includes(s)
                const paidToday = b && (b.payments || []).some(p => p.date === todayStr)
                const effectiveStatus = (isOcc && paidToday && s === 'occupied') ? 'paid-today' : s
                const cls      = STATUS_CLASSES[effectiveStatus] || STATUS_CLASSES.vacant
                const isCheckout = b && todayStr === b.checkout
                const isCheckin  = b && todayStr === b.checkin
                const basePrice  = prices[`${room?.type || 'standard'}_T`] || 0

                // Balance indicator
                const hasBalance = b && (() => {
                  const due  = bookingTotalDue({ ...b, room_type: room?.type || 'standard' }, prices, addons)
                  const paid = bookingAmountPaid(b)
                  return paid < due
                })()

                return (
                  <div
                    key={num}
                    onClick={() => setRoomModal(num)}
                    className={`border-2 rounded-xl p-2.5 cursor-pointer transition-transform hover:scale-[1.02] relative ${cls}`}
                  >
                    {/* Top right badges */}
                    <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                      {isOcc && (
                        <span
                          className={`text-[11px] ${b?.key_deposit ? 'opacity-50' : 'opacity-100'}`}
                          title={b?.key_deposit ? 'Deposit paid' : 'No deposit'}
                        >🔑</span>
                      )}
                      {hasBalance && (
                        <span className="text-[11px]" title="Balance outstanding">💰</span>
                      )}
                    </div>

                    <div className="font-bold text-sm leading-none mb-0.5">Room {num}</div>
                    <div className="text-[10px] opacity-70 mb-1.5 leading-tight">{room?.label}</div>

                    {s === 'maintenance' ? (
                      <div className="text-[11px] font-medium opacity-80">⚠ Maintenance</div>
                    ) : b ? (
                      <>
                        <div className="text-[11px] font-semibold leading-snug truncate">{b.guest}</div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${SRC_BADGE_CLASSES[b.source] || ''}`}>
                            {srcShort(b.source)}
                          </span>
                          {isCheckout && <span className="text-[9px] bg-white/20 px-1 rounded">Out</span>}
                          {isCheckin && !isCheckout && <span className="text-[9px] bg-white/20 px-1 rounded">In</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[11px]">Available</div>
                        <div className="text-[10px] opacity-60 mt-0.5">from {peso(basePrice)}/night</div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {roomModal && (
        <RoomModal
          roomNumber={roomModal}
          currentDate={currentDate}
          onClose={() => setRoomModal(null)}
          onAddBooking={() => { setRoomModal(null); onAddBooking(roomModal) }}
        />
      )}
    </div>
  )
}
