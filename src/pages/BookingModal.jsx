import React, { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { useData } from '../hooks/useData'
import { useToast } from '../components/Toast'
import {
  fmtDate, sortRoomKeys, srcLabel, calcNights, applyDiscount, peso,
  bookingsOverlap, genId, nowTimestamp
} from '../lib/utils'
import { upsertBooking } from '../lib/db'

const SOURCES = ['W','T','B','AG','EX']

export default function BookingModal({ bookingId, preRoom, currentDate, onClose, defaultHotelId }) {
  const { rooms, bookings, prices, addons, reload } = useData()
  const { toast } = useToast()

  const existing = bookings.find(b => b.id === bookingId) || null

  const [guest,        setGuest]        = useState(existing?.guest        || '')
  const [hotelId,      setHotelId]      = useState(existing?.hotel_id     || defaultHotelId || rooms[0]?.hotel_id || 'square')
  const [room,         setRoom]         = useState(existing?.room_number  || preRoom || '')
  const [checkin,      setCheckin]      = useState(existing?.checkin      || fmtDate(currentDate))
  const [checkout,     setCheckout]     = useState(existing?.checkout     || fmtDate(currentDate))
  const [ciTime,       setCiTime]       = useState(existing?.checkin_time_str  || '14:00')
  const [coTime,       setCoTime]       = useState(existing?.checkout_time_str || '23:59')
  const [source,       setSource]       = useState(existing?.source       || 'W')
  const [extraHead,    setExtraHead]    = useState(existing?.extra_head   || 0)
  const [extraBed,     setExtraBed]     = useState(existing?.extra_bed    || 0)
  const [breakfast,    setBreakfast]    = useState(existing?.breakfast    || 0)
  const [discType,     setDiscType]     = useState(existing?.discount_type  || 'none')
  const [discValue,    setDiscValue]    = useState(existing?.discount_value || 0)
  const [discNote,     setDiscNote]     = useState(existing?.discount_note  || '')
  const [notes,        setNotes]        = useState(existing?.notes         || '')
  const [keyDeposit,   setKeyDeposit]   = useState(existing?.key_deposit   || false)

  const roomDef = rooms.find(r => r.number === room)
  const nights  = checkin && checkout && checkout > checkin ? calcNights(checkin, checkout) : 0
  const baseRate = roomDef ? (prices[`${roomDef.type}_${source}`] || 0) : 0
  const addonRate = extraHead * (addons?.extraHead || 0) + extraBed * (addons?.extraBed || 0)
  const gross     = (baseRate + addonRate) * nights
  const net       = applyDiscount(gross, { discount_type: discType, discount_value: discValue })

  // Conflict check
  const conflict = rooms.length > 0 && checkin && checkout ? bookings.find(b =>
    b.hotel_id === hotelId &&
    b.room_number === room &&
    b.id !== bookingId &&
    bookingsOverlap(b.checkin, b.checkout, checkin, checkout, b.checkout_time_str || '12:00', ciTime)
  ) : null

  const save = async () => {
    if (!guest.trim())       { toast('Enter a guest name'); return }
    if (!checkin || !checkout) { toast('Set check-in and check-out'); return }
    if (checkin > checkout)  { toast('Check-out must be after check-in'); return }
    if (conflict)            { toast(`🚫 Room ${room} conflicts with ${conflict.guest}`); return }

    const today = fmtDate(currentDate)
    const payload = {
      id:               existing?.id || genId(),
      hotel_id:         hotelId,
      room_number:      room,
      guest:            guest.trim(),
      source,
      checkin,
      checkout,
      checkin_time_str: ciTime,
      checkout_time_str: coTime,
      extra_head:       extraHead,
      extra_bed:        extraBed,
      breakfast,
      discount_type:    discType,
      discount_value:   discValue,
      discount_note:    discNote,
      notes,
      key_deposit:      keyDeposit,
      payments:         existing?.payments || [],
      extensions:       existing?.extensions || [],
      room_moves:       existing?.room_moves || [],
      checked_out:      existing?.checked_out || false,
      checked_out_date: existing?.checked_out_date || null,
      invalid_checkout: existing?.invalid_checkout || false,
      invalid_checkout_date: existing?.invalid_checkout_date || null,
      checkin_time:     existing?.checkin_time || (today === checkin ? nowTimestamp() : null),
      checkout_time:    existing?.checkout_time || null,
    }

    await upsertBooking(payload)
    await reload()
    toast(existing ? 'Booking updated' : 'Booking added')
    onClose()
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit Booking' : 'Add Booking'}
      maxWidth="max-w-2xl"
      zIndex="z-[60]"
      footer={<>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        <button onClick={save} className="px-4 py-2 text-sm bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark">
          {existing ? 'Save Changes' : 'Save Booking'}
        </button>
      </>}
    >
      <div className="space-y-4">
        {/* Guest name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Guest name</label>
          <input className={inputClass} type="text" placeholder="Full name" value={guest}
            onChange={e => setGuest(e.target.value)} autoFocus />
        </div>

        {/* Hotel + Room */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Hotel</label>
            <select className={inputClass} value={hotelId} onChange={e => setHotelId(e.target.value)}>
              <option value="square">Square Hotel</option>
              <option value="pool">Pool Hotel</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Room</label>
            <select className={inputClass} value={room} onChange={e => setRoom(e.target.value)}>
              <option value="">Select…</option>
              {sortRoomKeys(rooms.filter(r => r.hotel_id === hotelId).map(r => r.number)).map(n => {
                const isConflict = checkin && checkout && n !== existing?.room_number && bookings.find(b =>
                  b.hotel_id === hotelId && b.room_number === n && b.id !== bookingId &&
                  bookingsOverlap(b.checkin, b.checkout, checkin, checkout, b.checkout_time_str || '12:00', ciTime)
                )
                const r = rooms.find(x => x.number === n)
                return (
                  <option key={n} value={n} style={isConflict ? { color: '#dc2626' } : {}}>
                    {n} – {r?.label}{isConflict ? ' ⚠️ Taken' : ''}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Check-in / Check-out */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Check-in</label>
            <div className="flex gap-2">
              <input className={`${inputClass} flex-1`} type="date" value={checkin} onChange={e => setCheckin(e.target.value)} />
              <input className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                type="time" value={ciTime} onChange={e => setCiTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Check-out {!existing && <span className="text-gray-400 normal-case font-normal">(defaults to 11:59 PM)</span>}
            </label>
            <div className="flex gap-2">
              <input className={`${inputClass} flex-1`} type="date" value={checkout} onChange={e => setCheckout(e.target.value)} />
              {/* Only show checkout time when editing an existing booking */}
              {existing && (
                <input className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  type="time" value={coTime} onChange={e => setCoTime(e.target.value)} />
              )}
            </div>
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Source</label>
          <div className="flex gap-2">
            {SOURCES.map(s => (
              <button key={s} onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  source === s ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand/40'
                }`}>{srcLabel(s)}</button>
            ))}
          </div>
        </div>

        {/* Add-ons */}
        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add-ons</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: `Extra head (+${peso(addons?.extraHead || 0)}/night)`, val: extraHead, set: setExtraHead },
              { label: `Extra bed (+${peso(addons?.extraBed  || 0)}/night)`, val: extraBed,  set: setExtraBed  },
              { label: `Breakfast (+${peso(addons?.breakfast || 0)}/night)`, val: breakfast, set: setBreakfast  },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-[10px] text-gray-500 mb-1 block">{label}</label>
                <input type="number" min="0" value={val} onChange={e => set(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Discount */}
        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Discount</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Type</label>
              <select value={discType} onChange={e => setDiscType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                <option value="none">None</option>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (₱)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Value</label>
              <input type="number" min="0" value={discValue} onChange={e => setDiscValue(parseFloat(e.target.value) || 0)}
                disabled={discType === 'none'}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-40" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Note</label>
              <input type="text" value={discNote} onChange={e => setDiscNote(e.target.value)} placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
          </div>
        </div>

        {/* Price preview */}
        {nights > 0 && (
          <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-600"><span>Gross ({nights} nights)</span><span className="font-mono">{peso(gross)}</span></div>
            {discType !== 'none' && discValue > 0 && (
              <div className="flex justify-between text-red-600"><span>Discount</span><span className="font-mono">−{peso(gross - net)}</span></div>
            )}
            <div className="flex justify-between font-bold text-brand border-t border-brand/20 pt-1 mt-1">
              <span>Amount due</span><span className="font-mono">{peso(net)}</span>
            </div>
          </div>
        )}

        {/* Notes + deposit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea className={inputClass} rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any special notes…" />
          </div>
          <div className="flex flex-col justify-end">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Key Deposit</label>
            <button
              type="button"
              onClick={() => setKeyDeposit(v => !v)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                keyDeposit
                  ? 'bg-brand border-brand text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-brand/40'
              }`}
            >
              <span className="text-xl">🔑</span>
              <span>{keyDeposit ? 'Deposit paid ✓' : 'Mark deposit paid'}</span>
            </button>
          </div>
        </div>

        {/* Conflict warning */}
        {conflict && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            🚫 Room {room} is already booked by <strong>{conflict.guest}</strong> ({conflict.checkin} – {conflict.checkout})
          </div>
        )}
      </div>
    </Modal>
  )
}
