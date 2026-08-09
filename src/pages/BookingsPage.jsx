import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import {
  shortDate,
  srcLabel,
  SRC_BADGE_CLASSES,
  peso,
  bookingTotalDue,
  bookingAmountPaid,
  calcNights,
  fmtDate,
} from '../lib/utils'
import { deleteBooking } from '../lib/db'
import BookingModal from './BookingModal'

const DATE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'current', label: 'Current' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'unpaid', label: '💰 Unpaid' },
]

export default function BookingsPage({ currentDate }) {
  const { bookings, rooms, prices, addons, reload } = useData()
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('current')
  const [editId, setEditId] = useState(null)
  const [sortBy, setSortBy] = useState('checkin')

  const todayStr = fmtDate(currentDate)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return [...bookings]
      .filter((b) => {
        if (
          q &&
          !b.guest.toLowerCase().includes(q) &&
          !b.room_number.includes(q) &&
          !(b.guest_phone || '').includes(q)
        )
          return false
        if (dateFilter === 'current') return b.checkin <= todayStr && b.checkout >= todayStr
        if (dateFilter === 'today') return b.checkin === todayStr || b.checkout === todayStr
        if (dateFilter === 'upcoming') return b.checkin > todayStr
        if (dateFilter === 'past') return b.checkout < todayStr
        if (dateFilter === 'unpaid') {
          const room = rooms.find((r) => r.number === b.room_number)
          const due = bookingTotalDue({ ...b, room_type: room?.type || 'standard' }, prices, addons)
          const paid = bookingAmountPaid(b)
          return paid < due
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'room') return a.room_number.localeCompare(b.room_number)
        if (sortBy === 'guest') return a.guest.localeCompare(b.guest)
        if (sortBy === 'checkout') return a.checkout.localeCompare(b.checkout)
        return b.checkin.localeCompare(a.checkin) // default: checkin desc
      })
  }, [bookings, search, dateFilter, todayStr, rooms, prices, addons])

  // Total balance owed across filtered bookings
  const totalOwed = useMemo(() => {
    return filtered.reduce((sum, b) => {
      const room = rooms.find((r) => r.number === b.room_number)
      const due = bookingTotalDue({ ...b, room_type: room?.type || 'standard' }, prices, addons)
      const paid = bookingAmountPaid(b)
      return sum + Math.max(0, due - paid)
    }, 0)
  }, [filtered, rooms, prices, addons])

  const totalDue = useMemo(() => {
    return filtered.reduce((sum, b) => {
      const room = rooms.find((r) => r.number === b.room_number)
      return sum + bookingTotalDue({ ...b, room_type: room?.type || 'standard' }, prices, addons)
    }, 0)
  }, [filtered, rooms, prices, addons])

  const del = async (id) => {
    if (!confirm('Delete this booking?')) return
    await deleteBooking(id)
    await reload()
    toast('Booking deleted')
  }

  return (
    <div className="p-5 space-y-4">
      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Search by guest, room, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                dateFilter === f.id
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/30 ml-auto"
        >
          <option value="checkin">Sort: Check-in ↓</option>
          <option value="checkout">Sort: Check-out</option>
          <option value="room">Sort: Room no.</option>
          <option value="guest">Sort: Guest name</option>
        </select>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
            <div className="text-[11px] text-gray-500">Bookings</div>
            <div className="text-xl font-extrabold text-gray-900">{filtered.length}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
            <div className="text-[11px] text-gray-500">Total due</div>
            <div className="text-xl font-extrabold text-gray-900">{peso(totalDue)}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
            <div className="text-[11px] text-gray-500">Outstanding balance</div>
            <div
              className={`text-xl font-extrabold ${totalOwed > 0 ? 'text-red-500' : 'text-brand'}`}
            >
              {totalOwed > 0 ? peso(totalOwed) : '✅ All paid'}
            </div>
          </div>
        </div>
      )}

      {/* Booking list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📅</div>
            <div>No bookings found.</div>
          </div>
        ) : (
          filtered.map((b) => {
            const room = rooms.find((r) => r.number === b.room_number)
            const due = bookingTotalDue(
              { ...b, room_type: room?.type || 'standard' },
              prices,
              addons,
            )
            const paid = bookingAmountPaid(b)
            const bal = Math.max(0, due - paid)
            const nights = calcNights(b.checkin, b.checkout)
            const payStatus = paid <= 0 ? 'unpaid' : paid >= due ? 'full' : 'partial'
            const isCheckin = b.checkin === todayStr
            const isCheckout = b.checkout === todayStr
            return (
              <div
                key={b.id}
                className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:border-gray-200 transition-colors"
              >
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 ${SRC_BADGE_CLASSES[b.source] || ''}`}
                >
                  {srcLabel(b.source)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                    {b.guest}
                    {isCheckin && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        Check-in today
                      </span>
                    )}
                    {isCheckout && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        Check-out today
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Room {b.room_number} · {shortDate(b.checkin)} – {shortDate(b.checkout)} ·{' '}
                    {nights} night{nights !== 1 ? 's' : ''}
                    {b.guest_phone && (
                      <>
                        {' '}
                        ·{' '}
                        <a
                          href={`tel:${b.guest_phone}`}
                          className="text-brand hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📞 {b.guest_phone}
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900">{peso(due)}</div>
                  <div
                    className={`text-xs font-medium ${
                      payStatus === 'full'
                        ? 'text-brand'
                        : payStatus === 'partial'
                          ? 'text-amber-600'
                          : 'text-red-500'
                    }`}
                  >
                    {payStatus === 'full'
                      ? '✅ Paid'
                      : payStatus === 'partial'
                        ? `${peso(bal)} balance`
                        : 'Unpaid'}
                  </div>
                </div>
                {b.key_deposit && (
                  <span className="text-sm" title="Deposit paid">
                    🔑
                  </span>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditId(b.id)}
                    className="text-gray-300 hover:text-brand text-lg transition-colors"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => del(b.id)}
                    className="text-gray-300 hover:text-red-500 text-lg transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {editId && (
        <BookingModal
          bookingId={editId}
          currentDate={currentDate}
          onClose={() => setEditId(null)}
        />
      )}
    </div>
  )
}
