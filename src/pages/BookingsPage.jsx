import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import {
  shortDate, srcLabel, SRC_BADGE_CLASSES, peso,
  bookingTotalDue, bookingAmountPaid, calcNights
} from '../lib/utils'
import { deleteBooking } from '../lib/db'
import BookingModal from './BookingModal'

export default function BookingsPage({ currentDate }) {
  const { bookings, rooms, prices, addons, reload } = useData()
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState(null)

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    return [...bookings]
      .filter(b => !q || b.guest.toLowerCase().includes(q) || b.room_number.includes(q))
      .sort((a, b) => b.checkin.localeCompare(a.checkin))
  }, [bookings, search])

  const del = async (id) => {
    if (!confirm('Delete this booking?')) return
    await deleteBooking(id)
    await reload()
    toast('Booking deleted')
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Search by guest or room…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-gray-400">{sorted.length} booking{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📅</div>
            <div>No bookings found.</div>
          </div>
        ) : sorted.map(b => {
          const room = rooms.find(r => r.number === b.room_number)
          const due  = bookingTotalDue({ ...b, room_type: room?.type || 'standard' }, prices, addons)
          const paid = bookingAmountPaid(b)
          const nights = calcNights(b.checkin, b.checkout)
          const payStatus = paid <= 0 ? 'unpaid' : paid >= due ? 'full' : 'partial'
          return (
            <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:border-gray-200 transition-colors">
              <span className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 ${SRC_BADGE_CLASSES[b.source] || ''}`}>
                {srcLabel(b.source)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{b.guest}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Room {b.room_number} · {shortDate(b.checkin)} – {shortDate(b.checkout)} · {nights} night{nights !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-gray-900">{peso(due)}</div>
                <div className={`text-xs font-medium ${
                  payStatus === 'full' ? 'text-brand' : payStatus === 'partial' ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {payStatus === 'full' ? '✅ Paid' : payStatus === 'partial' ? `${peso(paid)} paid` : 'Unpaid'}
                </div>
              </div>
              {b.key_deposit && <span className="text-sm" title="Deposit paid">🔑</span>}
              <div className="flex gap-1">
                <button onClick={() => setEditId(b.id)}
                  className="text-gray-300 hover:text-brand text-lg transition-colors">✎</button>
                <button onClick={() => del(b.id)}
                  className="text-gray-300 hover:text-red-500 text-lg transition-colors">×</button>
              </div>
            </div>
          )
        })}
      </div>

      {editId && (
        <BookingModal bookingId={editId} currentDate={currentDate} onClose={() => setEditId(null)} />
      )}
    </div>
  )
}
