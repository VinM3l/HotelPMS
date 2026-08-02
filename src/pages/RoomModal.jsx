import React, { useState } from 'react'
import Modal from '../components/Modal'
import { useData } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import {
  fmtDate, parseDate, shortDate, isInRangeInclusive, nowTimestamp, fmtTimestamp,
  bookingTotalDue, bookingAmountPaid, bookingPaymentStatus, peso, srcLabel, typeLabel,
  calcNights, applyDiscount, sortRoomKeys
} from '../lib/utils'
import { updateBookingField, deleteBooking as dbDeleteBooking, upsertBooking } from '../lib/db'
import BookingModal from './BookingModal'

export default function RoomModal({ roomNumber, currentDate, onClose, onAddBooking }) {
  const { rooms, bookings, prices, addons, reload } = useData()
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('guest')
  const [calYear, setCalYear] = useState(currentDate.getFullYear())
  const [calMonth, setCalMonth] = useState(currentDate.getMonth())
  const [addPaymentBid, setAddPaymentBid] = useState(null)
  const [pmtAmount, setPmtAmount] = useState('')
  const [pmtNote, setPmtNote] = useState('')
  const [pmtDate, setPmtDate] = useState(fmtDate(currentDate))
  const [editBookingId, setEditBookingId] = useState(null)
  const [extendId, setExtendId] = useState(null)
  const [newCheckout, setNewCheckout] = useState('')
  const [moveId, setMoveId] = useState(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [moveNote, setMoveNote] = useState('')

  const todayStr = fmtDate(currentDate)
  const room = rooms.find(r => r.number === roomNumber)
  const roomBookings = bookings.filter(b => b.room_number === roomNumber)
  const currentBookings = roomBookings.filter(b => isInRangeInclusive(currentDate, b.checkin, b.checkout))

  const extendBooking = bookings.find(b => b.id === extendId)
  const moveBooking   = bookings.find(b => b.id === moveId)

  const addPayment = async (b) => {
    const amt = parseFloat(pmtAmount)
    if (!amt || amt <= 0) { toast('Enter a valid amount'); return }
    const payments = [...(b.payments || []), { amount: amt, date: pmtDate, note: pmtNote || 'Payment' }]
    await updateBookingField(b.id, { payments })
    await reload()
    setPmtAmount(''); setPmtNote(''); setAddPaymentBid(null)
    const updatedB = { ...b, payments }
    const status = bookingPaymentStatus(updatedB, prices, addons)
    toast(status === 'full' ? `✅ ${peso(amt)} added — balance fully settled!` : `💰 ${peso(amt)} recorded`)
  }

  const removePayment = async (b, idx) => {
    if (!confirm(`Remove payment of ${peso(b.payments[idx]?.amount)}?`)) return
    const payments = b.payments.filter((_, i) => i !== idx)
    await updateBookingField(b.id, { payments })
    await reload()
    toast('Payment entry removed')
  }

  const toggleDeposit = async (b) => {
    await updateBookingField(b.id, { key_deposit: !b.key_deposit })
    await reload()
    toast(b.key_deposit ? 'Key deposit cleared' : '🔑 Key deposit marked as paid')
  }

  const markCheckedIn = async (b) => {
    await updateBookingField(b.id, { checkin_time: nowTimestamp() })
    await reload()
    toast('✅ Check-in time recorded')
  }

  const clearCheckinTime = async (b) => {
    await updateBookingField(b.id, { checkin_time: null })
    await reload()
    toast('Check-in stamp cleared')
  }

  const markCheckedOut = async (b) => {
    await updateBookingField(b.id, {
      checked_out: true,
      checked_out_date: todayStr,
      checkout_time: nowTimestamp(),
    })
    await reload()
    toast('🚪 Checked out')
  }

  const markInvalidCheckout = async (b) => {
    if (!confirm(`Mark ${b.guest} as invalid checkout? This will flag the room in red.`)) return
    await updateBookingField(b.id, {
      invalid_checkout: true,
      invalid_checkout_date: todayStr,
    })
    await reload()
    toast('🔴 Invalid checkout recorded')
  }

  const clearCheckoutFlag = async (b) => {
    await updateBookingField(b.id, {
      checked_out: false,
      checked_out_date: null,
      invalid_checkout: false,
      invalid_checkout_date: null,
      checkout_time: null,
    })
    await reload()
    toast('↩ Checkout cleared')
  }

  const confirmExtend = async () => {
    const b = extendBooking
    if (!b || !newCheckout || newCheckout <= b.checkout) {
      toast('New checkout must be after current checkout'); return
    }
    const exts = b.extensions || []
    const originalCheckout = exts.length === 0 ? b.checkout : exts[0].originalCheckout
    const newExts = [...exts, { originalCheckout, previousCheckout: b.checkout, checkout: newCheckout, addedAt: new Date().toISOString() }]
    await updateBookingField(b.id, { extensions: newExts, checkout: newCheckout })
    await reload()
    setExtendId(null)
    toast(`✅ Stay extended to ${shortDate(newCheckout)}`)
  }

  const confirmMove = async () => {
    const b = moveBooking
    if (!b || !moveTarget || moveTarget === b.room_number) { toast('Select a different room'); return }
    if (!confirm(`Move ${b.guest} from room ${b.room_number} to ${moveTarget}? This cannot be undone.`)) return
    const moveDate = todayStr
    const originalCheckout = b.extensions?.length ? b.extensions[b.extensions.length - 1].checkout : b.checkout
    const newBooking = {
      id: 'bk_' + Date.now(),
      hotel_id: b.hotel_id,
      room_number: moveTarget,
      guest: b.guest,
      source: b.source,
      checkin: moveDate,
      checkout: originalCheckout,
      checkin_time_str: b.checkin_time_str || '14:00',
      checkout_time_str: b.checkout_time_str || '12:00',
      extra_head: b.extra_head || 0,
      extra_bed: b.extra_bed || 0,
      breakfast: b.breakfast || 0,
      discount_type: b.discount_type || 'none',
      discount_value: b.discount_value || 0,
      discount_note: b.discount_note || '',
      notes: b.notes || '',
      payments: [],
      extensions: [],
      room_moves: [...(b.room_moves || []), { from: b.room_number, to: moveTarget, date: moveDate, note: moveNote }],
      key_deposit: false,
      checked_out: false,
      invalid_checkout: false,
    }
    if (b.checkin === moveDate) {
      await dbDeleteBooking(b.id)
      if (b.key_deposit) newBooking.key_deposit = true
    } else {
      const yesterday = new Date(currentDate)
      yesterday.setDate(yesterday.getDate() - 1)
      await updateBookingField(b.id, { checkout: fmtDate(yesterday) })
    }
    await upsertBooking(newBooking)
    await reload()
    setMoveId(null)
    toast(`✅ ${b.guest} moved to ${moveTarget}`)
    onClose()
  }

  const deleteBookingLocal = async (id) => {
    if (!confirm('Delete this booking?')) return
    await dbDeleteBooking(id)
    await reload()
    toast('Booking deleted')
    if (currentBookings.length <= 1) onClose()
  }

  // Room type for room-details tab
  const roomType = room?.type || 'standard'

  const TABS = [
    { id: 'guest',    label: '👤 Guest' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'details',  label: 'Details' },
  ]

  return (
    <>
    <Modal
      open
      onClose={onClose}
      title={`Room ${roomNumber}`}
      subtitle={`${room?.label || ''}`}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Close</button>
          <button onClick={onAddBooking} className="px-4 py-2 text-sm bg-brand text-white rounded-lg font-medium hover:bg-brand-dark">+ Add Booking</button>
        </>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 -mt-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* GUEST TAB */}
      {tab === 'guest' && (
        <div className="space-y-4">
          {currentBookings.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-2">🛏</div>
              <div className="text-sm">No guest today</div>
              <button onClick={onAddBooking} className="mt-3 text-sm text-brand font-medium hover:underline">Add a booking →</button>
            </div>
          ) : currentBookings.map(b => {
            const due  = bookingTotalDue({ ...b, room_type: roomType }, prices, addons)
            const paid = bookingAmountPaid(b)
            const bal  = Math.max(0, due - paid)
            const nights = calcNights(b.checkin, b.checkout)
            const coActive  = b.checked_out && (b.checked_out_date ? todayStr >= b.checked_out_date : true)
            const invActive = b.invalid_checkout && (b.invalid_checkout_date ? todayStr >= b.invalid_checkout_date : true)
            return (
              <div key={b.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                {/* Guest header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="font-bold text-gray-900 text-base">{b.guest}</div>
                    {b.guest_phone && (
                      <a href={`tel:${b.guest_phone}`} className="text-xs text-brand font-medium hover:underline">
                        📞 {b.guest_phone}
                      </a>
                    )}
                    <div className="text-xs text-gray-500 mt-0.5">
                      {shortDate(b.checkin)} – {shortDate(b.checkout)} · {nights} night{nights !== 1 ? 's' : ''}
                    </div>
                    {b.notes && <div className="text-xs text-gray-400 italic mt-0.5">"{b.notes}"</div>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                    b.source === 'T' ? 'bg-blue-100 text-blue-700' :
                    b.source === 'W' ? 'bg-gray-100 text-gray-600' :
                    b.source === 'B' ? 'bg-indigo-100 text-indigo-700' :
                    b.source === 'AG' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{srcLabel(b.source)}</span>
                </div>

                {/* Financials */}
                <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3 text-sm">
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Total due</span><span className="font-semibold">{peso(due)}</span>
                  </div>
                  <div className="flex justify-between text-green-700 mb-1">
                    <span>Paid</span><span className="font-semibold">{peso(paid)}</span>
                  </div>
                  {bal > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Balance</span><span>{peso(bal)}</span>
                    </div>
                  )}

                  {/* Payment history */}
                  {(b.payments || []).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                      {b.payments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-gray-500">
                          <span>{p.date} · {p.note}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{peso(p.amount)}</span>
                            {isAdmin() && (
                              <button onClick={() => removePayment(b, i)} className="text-red-400 hover:text-red-600">×</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add payment */}
                  {addPaymentBid === b.id ? (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                      <div className="flex gap-2">
                        <input type="number" placeholder="Amount" value={pmtAmount}
                          onChange={e => setPmtAmount(e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                        <input type="date" value={pmtDate}
                          onChange={e => setPmtDate(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                      </div>
                      <input type="text" placeholder="Note (optional)" value={pmtNote}
                        onChange={e => setPmtNote(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setAddPaymentBid(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        <button onClick={() => addPayment(b)} className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg font-medium">Add</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddPaymentBid(b.id); setPmtAmount(String(bal || due)); setPmtDate(fmtDate(currentDate)); setPmtNote('') }}
                      className="mt-2 text-xs text-brand font-medium hover:underline"
                    >+ Add payment</button>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleDeposit(b)}
                    className={`text-xs py-2 px-3 rounded-lg font-medium transition-colors ${
                      b.key_deposit ? 'bg-brand/10 text-brand hover:bg-brand/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >🔑 {b.key_deposit ? 'Deposit paid' : 'Mark deposit paid'}</button>

                  {!b.checkin_time && todayStr >= b.checkin && (
                    <button onClick={() => markCheckedIn(b)}
                      className="text-xs py-2 px-3 rounded-lg bg-green-50 text-green-700 font-medium hover:bg-green-100">
                      ✅ Mark arrived
                    </button>
                  )}
                  {b.checkin_time && (
                    <div className="text-xs text-gray-400 py-2 px-3 flex items-center gap-1">
                      ✅ {fmtTimestamp(b.checkin_time)}
                      <button onClick={() => clearCheckinTime(b)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                    </div>
                  )}

                  <button onClick={() => { setExtendId(b.id); setNewCheckout('') }}
                    className="text-xs py-2 px-3 rounded-lg bg-amber-50 text-amber-700 font-medium hover:bg-amber-100">
                    ⟳ Extend stay
                  </button>

                  <button onClick={() => { setMoveId(b.id); setMoveTarget(''); setMoveNote('') }}
                    className="text-xs py-2 px-3 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">
                    ↔ Move room
                  </button>

                  {coActive || invActive ? (
                    <button onClick={() => clearCheckoutFlag(b)}
                      className="text-xs py-2 px-3 rounded-lg bg-gray-50 text-gray-600 font-medium hover:bg-gray-100">
                      ↩ Undo checkout
                    </button>
                  ) : (
                    <>
                      <button onClick={() => markCheckedOut(b)}
                        className="text-xs py-2 px-3 rounded-lg bg-blue-50 text-blue-800 font-medium hover:bg-blue-100">
                        🚪 Mark checked out
                      </button>
                      <button onClick={() => markInvalidCheckout(b)}
                        className="text-xs py-2 px-3 rounded-lg bg-red-50 text-red-700 font-medium hover:bg-red-100">
                        🔴 Invalid checkout
                      </button>
                    </>
                  )}

                  <button onClick={() => setEditBookingId(b.id)}
                    className="text-xs py-2 px-3 rounded-lg bg-gray-50 text-gray-700 font-medium hover:bg-gray-100">
                    ✎ Edit booking
                  </button>
                  <button onClick={() => deleteBookingLocal(b.id)}
                    className="text-xs py-2 px-3 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100">
                    🗑 Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div>
          {/* Mini calendar nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { let m = calMonth - 1, y = calYear; if (m < 0) { m = 11; y-- } setCalMonth(m); setCalYear(y) }}
              className="text-gray-400 hover:text-gray-700 px-2">←</button>
            <span className="text-sm font-semibold">
              {new Date(calYear, calMonth, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => { let m = calMonth + 1, y = calYear; if (m > 11) { m = 0; y++ } setCalMonth(m); setCalYear(y) }}
              className="text-gray-400 hover:text-gray-700 px-2">→</button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs mb-0.5">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>

          {(() => {
            const firstDay = new Date(calYear, calMonth, 1).getDay()
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
            const prevDays = new Date(calYear, calMonth, 0).getDate()
            const cells = []
            for (let i = 0; i < firstDay; i++) {
              cells.push(<div key={`p${i}`} className="text-gray-200 text-xs text-center py-1.5">{prevDays - firstDay + 1 + i}</div>)
            }
            for (let d = 1; d <= daysInMonth; d++) {
              const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const b = roomBookings.find(bk => isInRangeInclusive(new Date(ds + 'T00:00:00'), bk.checkin, bk.checkout))
              const isToday = ds === todayStr
              const isCI = b && ds === b.checkin
              const isCO = b && ds === b.checkout
              const hasPmt = b && (b.payments || []).some(p => p.date === ds)
              let bg = ''
              if (b) {
                if (isCI) bg = 'bg-green-100 text-green-800'
                else if (isCO) bg = 'bg-orange-100 text-orange-800'
                else bg = 'bg-brand/10 text-brand'
              }
              cells.push(
                <div key={d} className={`text-xs text-center py-1 rounded-sm ${bg} ${isToday ? 'ring-2 ring-brand' : ''} relative`}>
                  <div className="font-medium">{d}</div>
                  {b && <div className="text-[9px] truncate leading-none mt-0.5 opacity-70">{b.guest.split(' ')[0]}</div>}
                  {hasPmt && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </div>
              )
            }
            const rem = (firstDay + daysInMonth) % 7
            for (let i = 1; i <= (rem ? 7 - rem : 0); i++) {
              cells.push(<div key={`n${i}`} className="text-gray-200 text-xs text-center py-1.5">{i}</div>)
            }
            return <div className="grid grid-cols-7 gap-0.5">{cells}</div>
          })()}

          {/* Booking history */}
          <div className="mt-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Guest history</div>
            {roomBookings.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No bookings yet.</div>
            ) : [...roomBookings].sort((a, b) => a.checkin.localeCompare(b.checkin)).map(b => {
              const due = bookingTotalDue({ ...b, room_type: roomType }, prices, addons)
              return (
                <div key={b.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    b.source === 'T' ? 'bg-blue-100 text-blue-700' :
                    b.source === 'W' ? 'bg-gray-100 text-gray-600' :
                    b.source === 'B' ? 'bg-indigo-100 text-indigo-700' :
                    b.source === 'AG' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{srcLabel(b.source)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{b.guest}</div>
                    <div className="text-xs text-gray-400">{shortDate(b.checkin)} – {shortDate(b.checkout)}</div>
                  </div>
                  <div className="text-xs text-gray-500">{peso(due)}</div>
                  <button onClick={() => setEditBookingId(b.id)} className="text-gray-300 hover:text-gray-600 text-base">✎</button>
                  <button onClick={() => deleteBookingLocal(b.id)} className="text-gray-300 hover:text-red-500 text-base">×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DETAILS TAB */}
      {tab === 'details' && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Room status</div>
          <div className="flex gap-2 mb-5">
            {['vacant', 'maintenance'].map(s => (
              <button
                key={s}
                onClick={async () => {
                  const { updateRoomStatus } = await import('../lib/db')
                  await updateRoomStatus(room.id, s)
                  await reload()
                  toast('Room status updated')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  room?.status === s
                    ? s === 'vacant' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-700 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >{s === 'vacant' ? '✅ Vacant' : '⚠ Maintenance'}</button>
            ))}
          </div>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Rates for {room?.label} (₱/night)
          </div>
          <div className="space-y-2">
            {[['T','Trip.com'],['W','Walk-in'],['B','Booking.com'],['AG','Agoda'],['EX','Expedia']].map(([src, label]) => {
              const key = `${roomType}_${src}`
              return (
                <div key={src} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28">{label}</span>
                  <input
                    type="number"
                    defaultValue={prices[key] || 0}
                    onBlur={async (e) => {
                      const { updatePrice } = await import('../lib/db')
                      await updatePrice(roomType, src, parseFloat(e.target.value) || 0)
                      await reload()
                      toast('Rate saved')
                    }}
                    className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>

    {/* Extend stay modal */}
    {extendId && extendBooking && (
      <Modal open onClose={() => setExtendId(null)} title="⟳ Extend Stay"
        subtitle={`${extendBooking.guest} · Room ${roomNumber}`} maxWidth="max-w-sm" zIndex="z-[60]"
        footer={<>
          <button onClick={() => setExtendId(null)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          <button onClick={confirmExtend} className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600">Confirm</button>
        </>}
      >
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs text-amber-700 font-semibold mb-1">Current checkout</div>
            <div className="text-lg font-extrabold text-amber-800">{shortDate(extendBooking.checkout)}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New checkout date</label>
            <input type="date" value={newCheckout} onChange={e => setNewCheckout(e.target.value)}
              min={(() => {
                const [y, m, d] = extendBooking.checkout.split('-').map(Number)
                const next = new Date(y, m - 1, d + 1)
                return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
              })()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
        </div>
      </Modal>
    )}

    {/* Move room modal */}
    {moveId && moveBooking && (
      <Modal open onClose={() => setMoveId(null)} title="↔ Move Guest"
        subtitle={`${moveBooking.guest} currently in Room ${moveBooking.room_number}`} maxWidth="max-w-sm" zIndex="z-[60]"
        footer={<>
          <button onClick={() => setMoveId(null)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          <button onClick={confirmMove} className="px-4 py-2 text-sm bg-brand text-white rounded-lg font-medium hover:bg-brand-dark">Move</button>
        </>}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New room</label>
            <select value={moveTarget} onChange={e => setMoveTarget(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option value="">Select room…</option>
              {sortRoomKeys(rooms.map(r => r.number)).filter(n => n !== roomNumber).map(n => (
                <option key={n} value={n}>Room {n} — {rooms.find(r => r.number === n)?.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason (optional)</label>
            <input type="text" value={moveNote} onChange={e => setMoveNote(e.target.value)}
              placeholder="e.g. Guest request"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
        </div>
      </Modal>
    )}

    {/* Edit booking */}
    {editBookingId && (
      <BookingModal
        bookingId={editBookingId}
        onClose={() => setEditBookingId(null)}
        currentDate={currentDate}
      />
    )}
    </>
  )
}
