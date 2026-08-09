import React, { useState } from 'react'
import { useData } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { sortRoomKeys } from '../lib/utils'
import { addRoom, removeRoom, updateRoomStatus } from '../lib/db'
import Modal from '../components/Modal'

const TYPES = [
  { id: 'standard', label: 'Standard Room' },
  { id: 'family2', label: 'Family Room (2 pax)' },
  { id: 'family3', label: 'Family Room (3 pax)' },
]

export default function RoomsPage({ hotelId }) {
  const { rooms, bookings, reload } = useData()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newType, setNewType] = useState('standard')

  const hotelRooms = rooms.filter((r) => r.hotel_id === hotelId)
  const sorted = sortRoomKeys(hotelRooms.map((r) => r.number))

  const handleStatus = async (room, status) => {
    await updateRoomStatus(room.id, status)
    await reload()
    toast('Room status updated')
  }

  const handleRemove = async (room) => {
    const orphans = bookings.filter((b) => b.hotel_id === hotelId && b.room_number === room.number)
    const msg = orphans.length
      ? `Remove room ${room.number}? It has ${orphans.length} booking(s) on record — they remain but the room won't appear on the dashboard.`
      : `Remove room ${room.number}?`
    if (!confirm(msg)) return
    await removeRoom(room.id)
    await reload()
    toast('Room removed')
  }

  const handleAdd = async () => {
    if (!newNumber.trim()) {
      toast('Enter a room number')
      return
    }
    const type = TYPES.find((t) => t.id === newType)
    try {
      await addRoom(hotelId, newNumber.trim(), newType, type.label)
      await reload()
      toast(`Room ${newNumber} added`)
      setAddOpen(false)
      setNewNumber('')
    } catch (e) {
      toast('Room number already exists or invalid')
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Room Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="text-sm bg-brand text-white px-3 py-1.5 rounded-lg font-medium hover:bg-brand-dark"
        >
          + Add Room
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {sorted.map((num) => {
          const room = hotelRooms.find((r) => r.number === num)
          return (
            <div key={num} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-gray-900">Room {num}</span>
                <button
                  onClick={() => handleRemove(room)}
                  className="text-gray-300 hover:text-red-500 text-base"
                >
                  ×
                </button>
              </div>
              <div className="text-xs text-gray-400 mb-3">{room?.label}</div>
              <div className="flex gap-1.5">
                {['vacant', 'maintenance'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatus(room, s)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md flex-1 transition-colors border ${
                      room?.status === s
                        ? s === 'vacant'
                          ? 'bg-green-100 border-green-400 text-green-700'
                          : 'bg-gray-700 border-gray-700 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {s === 'vacant' ? '✅ Vacant' : '⚠ Maint.'}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Room"
        maxWidth="max-w-sm"
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-500">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm bg-brand text-white rounded-lg font-semibold"
            >
              Add Room
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Room number
            </label>
            <input
              type="text"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="e.g. 310 or E04"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
