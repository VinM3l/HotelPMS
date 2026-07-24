import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchRooms, fetchBookings, fetchPrices, fetchAddons } from '../lib/db'

const DataContext = createContext(null)

export function DataProvider({ children, hotelId }) {
  const [rooms, setRooms]       = useState([])
  const [bookings, setBookings] = useState([])
  const [prices, setPrices]     = useState({})
  const [addons, setAddons]     = useState({ extraHead: 350, extraBed: 500, breakfast: 150 })
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    setError(null)
    try {
      const [r, b, p, a] = await Promise.all([
        fetchRooms(hotelId),
        fetchBookings(hotelId),
        fetchPrices(),
        fetchAddons(),
      ])
      setRooms(r)
      setBookings(b)
      setPrices(p)
      setAddons(a)
    } catch (e) {
      console.error('Data load error:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [hotelId])

  useEffect(() => { load() }, [load])

  // Provide a room type lookup
  const getRoomType = (roomNumber) => rooms.find(r => r.number === roomNumber)?.type || 'standard'

  // Get the booking active on a given date for a room (inclusive)
  const getBookingOnDate = (roomNumber, date) => {
    const ds = typeof date === 'string' ? date : date.toISOString().slice(0, 10)
    return bookings.find(b =>
      b.room_number === roomNumber &&
      b.checkin <= ds && b.checkout >= ds
    ) || null
  }

  return (
    <DataContext.Provider value={{
      rooms, setRooms,
      bookings, setBookings,
      prices, setPrices,
      addons, setAddons,
      loading, error,
      reload: load,
      getRoomType,
      getBookingOnDate,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
