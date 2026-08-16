import React, { useState, useEffect } from 'react'
import { useData } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { updatePrice, updateAddon } from '../lib/db'
import { peso } from '../lib/utils'
import { INPUT_CLASS_COMPACT } from '../lib/theme'

const SOURCES = [
  { id: 'T', label: 'Trip.com' },
  { id: 'W', label: 'Walk-in' },
  { id: 'B', label: 'Booking.com' },
  { id: 'AG', label: 'Agoda' },
  { id: 'EX', label: 'Expedia' },
]

const TYPES = [
  { id: 'standard', label: 'Standard Room' },
  { id: 'family2', label: 'Family Room (2 pax)' },
  { id: 'family3', label: 'Family Room (3 pax)' },
]

export default function PricesPage() {
  const { prices, addons, reload } = useData()
  const { toast } = useToast()

  // Local editable copies, kept in sync with context so external updates
  // (reload after save, another tab/teammate editing) don't leave stale values on screen.
  const [priceDraft, setPriceDraft] = useState(prices || {})
  const [addonDraft, setAddonDraft] = useState(addons || {})

  useEffect(() => {
    setPriceDraft(prices || {})
  }, [prices])
  useEffect(() => {
    setAddonDraft(addons || {})
  }, [addons])

  const savePrice = async (type, src, val) => {
    await updatePrice(type, src, parseFloat(val) || 0)
    await reload()
    toast('Rate saved')
  }

  const saveAddon = async (id, val) => {
    await updateAddon(id, parseFloat(val) || 0)
    await reload()
    toast('Add-on rate saved')
  }

  const inputClass = INPUT_CLASS_COMPACT

  return (
    <div className="p-5 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-1">Room Rates (₱ per night)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Set base rates by room type and channel. Changes apply to future income calculations.
        </p>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Room type
                </th>
                {SOURCES.map((s) => (
                  <th
                    key={s.id}
                    className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TYPES.map((type, ri) => (
                <tr key={type.id} className={ri % 2 === 1 ? 'bg-gray-50/50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-700">{type.label}</td>
                  {SOURCES.map((src) => {
                    const key = `${type.id}_${src.id}`
                    return (
                      <td key={src.id} className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={priceDraft[key] ?? 0}
                          onChange={(e) => setPriceDraft((d) => ({ ...d, [key]: e.target.value }))}
                          onBlur={(e) => savePrice(type.id, src.id, e.target.value)}
                          className={inputClass}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-1">Add-on Rates (₱ per night)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Charged per guest per night in addition to the base room rate.
        </p>
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
          {[
            { id: 'extraHead', label: 'Extra head (person)' },
            { id: 'extraBed', label: 'Extra bed' },
            { id: 'breakfast', label: 'Breakfast (per person per day)' },
          ].map(({ id, label }) => (
            <div key={id} className="flex items-center gap-4">
              <span className="text-sm text-gray-600 w-56">{label}</span>
              <input
                type="number"
                value={addonDraft[id] ?? 0}
                onChange={(e) => setAddonDraft((d) => ({ ...d, [id]: e.target.value }))}
                onBlur={(e) => saveAddon(id, e.target.value)}
                className={inputClass}
              />
              <span className="text-xs text-gray-400">{peso(addonDraft[id] || 0)}/night</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
