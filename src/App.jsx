import React, { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DataProvider, useData } from './hooks/useData'
import { ToastProvider } from './components/Toast'
import LoginPage     from './pages/LoginPage'
import Sidebar       from './components/Sidebar'
import Dashboard     from './pages/Dashboard'
import BookingsPage  from './pages/BookingsPage'
import RoomsPage     from './pages/RoomsPage'
import PricesPage    from './pages/PricesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import MonthView     from './pages/MonthView'
import BookingModal  from './pages/BookingModal'
import RoomModal     from './pages/RoomModal'
import LoadingScreen from './components/LoadingScreen'
import { fmtDate, dateLabel } from './lib/utils'

function PageContent({ page, hotel, currentDate, setAddBooking, setOpenRoom }) {
  const { loading, error } = useData()

  if (loading) return <LoadingScreen message="Loading hotel data…" />
  if (error)   return (
    <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2">
      <div className="text-3xl">⚠️</div>
      <div className="font-semibold">Failed to load data</div>
      <div className="text-sm text-gray-400">{error}</div>
      <button onClick={() => window.location.reload()}
        className="mt-2 text-sm border border-gray-200 px-4 py-2 rounded-lg hover:border-brand/40">
        Retry
      </button>
    </div>
  )

  return (
    <>
      {page === 'dashboard'  && <Dashboard currentDate={currentDate} onAddBooking={(room) => setAddBooking(room || true)} />}
      {page === 'rooms'      && <RoomsPage hotelId={hotel} />}
      {page === 'bookings'   && <BookingsPage currentDate={currentDate} />}
      {page === 'prices'     && <PricesPage />}
      {page === 'analytics'  && <AnalyticsPage />}
      {page === 'monthview'  && (
        <MonthView
          currentDate={currentDate}
          onRoomClick={(num) => setOpenRoom(num)}
          onAddBooking={(num) => setAddBooking(num)}
        />
      )}
    </>
  )
}

function Shell() {
  const { user, loading, canAccess } = useAuth()
  const [page,        setPage]    = useState('dashboard')
  const [hotel,       setHotel]   = useState('square')
  const [sidebarOpen, setSidebar] = useState(true)
  const [currentDate, setDate]    = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [addBooking,  setAddBooking] = useState(null)
  const [openRoom,    setOpenRoom]   = useState(null)

  const switchHotel = (h) => { setHotel(h); setPage('dashboard'); setOpenRoom(null); setAddBooking(null) }
  const changeDay   = (d) => setDate(prev => { const n = new Date(prev); n.setDate(n.getDate() + d); return n })
  const goToday     = () => { const d = new Date(); d.setHours(0,0,0,0); setDate(d) }
  const navigate    = (p) => { if (!canAccess(p)) return; setPage(p) }

  if (loading) return <LoadingScreen message="Loading…" />
  if (!user) return <LoginPage />

  const PAGE_TITLES = {
    dashboard: 'Dashboard', rooms: 'Room Management', bookings: 'All Bookings',
    prices: 'Room Rates', analytics: 'Analytics', monthview: 'Month View',
  }

  return (
    <DataProvider hotelId={hotel}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar
            currentPage={page}
            onPage={navigate}
            currentHotel={hotel}
            onHotel={switchHotel}
            currentDate={currentDate}
            onCollapse={() => setSidebar(false)}
          />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          {/* Topbar */}
          <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0 gap-3">
            <div className="flex items-center gap-3">
              {/* Collapse/expand toggle */}
              <button
                onClick={() => setSidebar(v => !v)}
                className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl flex-shrink-0"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >☰</button>
              <span className="font-bold text-gray-900">{PAGE_TITLES[page]}</span>
            </div>

            <div className="flex items-center gap-3">
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
                className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors whitespace-nowrap"
              >+ Booking</button>
            </div>
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-hidden">
            <PageContent
              page={page}
              hotel={hotel}
              currentDate={currentDate}
              setAddBooking={setAddBooking}
              setOpenRoom={setOpenRoom}
            />
          </div>
        </div>
      </div>

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
