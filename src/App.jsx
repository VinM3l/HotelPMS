import React, { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DataProvider } from './hooks/useData'
import { ToastProvider } from './components/Toast'
import LoginPage   from './pages/LoginPage'
import Sidebar     from './components/Sidebar'
import Dashboard   from './pages/Dashboard'
import BookingsPage from './pages/BookingsPage'
import RoomsPage   from './pages/RoomsPage'
import PricesPage  from './pages/PricesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import MonthView   from './pages/MonthView'
import BookingModal from './pages/BookingModal'
import RoomModal   from './pages/RoomModal'
import { fmtDate, dateLabel } from './lib/utils'

function Shell() {
  const { user, isAdmin, canAccess } = useAuth()
  const [page,       setPage]       = useState('dashboard')
  const [hotel,      setHotel]      = useState('square')
  const [currentDate, setDate]      = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [addBooking,  setAddBooking] = useState(null)  // null | roomNumber | true
  const [openRoom,    setOpenRoom]   = useState(null)  // room number

  const switchHotel = (h) => {
    setHotel(h)
    setPage('dashboard')
    setOpenRoom(null)
    setAddBooking(null)
  }

  if (!user) return <LoginPage />

  const changeDay = (d) => {
    setDate(prev => {
      const next = new Date(prev)
      next.setDate(next.getDate() + d)
      return next
    })
  }
  const goToday = () => {
    const d = new Date(); d.setHours(0,0,0,0)
    setDate(d)
  }

  const navigate = (p) => {
    if (!canAccess(p)) return
    setPage(p)
  }

  const PAGE_TITLES = {
    dashboard:  'Dashboard',
    rooms:      'Room Management',
    bookings:   'All Bookings',
    prices:     'Room Rates',
    analytics:  'Analytics',
    monthview:  'Month View',
  }

  return (
    <DataProvider hotelId={hotel}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar
          currentPage={page}
          onPage={navigate}
          currentHotel={hotel}
          onHotel={switchHotel}
          currentDate={currentDate}
        />

        <div className="flex flex-col flex-1 min-w-0">
          {/* Topbar */}
          <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
            <span className="font-bold text-gray-900">{PAGE_TITLES[page]}</span>
            <div className="flex items-center gap-3">
              {/* Date nav — only relevant on dashboard */}
              {page === 'dashboard' && (
                <div className="flex items-center gap-1">
                  <button onClick={() => changeDay(-1)} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg">‹</button>
                  <span className="text-sm text-gray-700 font-medium min-w-[160px] text-center">{dateLabel(currentDate)}</span>
                  <button onClick={() => changeDay(1)} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg">›</button>
                  <button onClick={goToday} className="text-xs border border-gray-200 px-2.5 py-1 rounded-lg text-gray-600 hover:border-brand/40 ml-1">Today</button>
                </div>
              )}
              <button
                onClick={() => setAddBooking(true)}
                className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
              >+ Booking</button>
            </div>
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-hidden">
            {page === 'dashboard'  && (
              <Dashboard
                currentDate={currentDate}
                onAddBooking={(room) => setAddBooking(room || true)}
              />
            )}
            {page === 'rooms'     && <RoomsPage hotelId={hotel} />}
            {page === 'bookings'  && <BookingsPage currentDate={currentDate} />}
            {page === 'prices'    && <PricesPage />}
            {page === 'analytics' && <AnalyticsPage />}
            {page === 'monthview' && (
              <MonthView
                currentDate={currentDate}
                onRoomClick={(num) => setOpenRoom(num)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Global modals */}
      {addBooking && (
        <BookingModal
          preRoom={typeof addBooking === 'string' ? addBooking : undefined}
          currentDate={currentDate}
          defaultHotelId={hotel}
          onClose={() => setAddBooking(null)}
        />
      )}
      {openRoom && (
        <RoomModal
          roomNumber={openRoom}
          currentDate={currentDate}
          onClose={() => setOpenRoom(null)}
          onAddBooking={() => { setAddBooking(openRoom); setOpenRoom(null) }}
        />
      )}
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  )
}
