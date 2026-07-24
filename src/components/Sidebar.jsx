import React from 'react'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { id: 'dashboard', icon: '📋', label: 'Dashboard' },
  { id: 'rooms',     icon: '🚪', label: 'Rooms',    adminOnly: true },
  { id: 'bookings',  icon: '📅', label: 'Bookings' },
  { id: 'prices',    icon: '💰', label: 'Prices',   adminOnly: true },
  { id: 'analytics', icon: '📊', label: 'Analytics', adminOnly: true },
  { id: 'monthview', icon: '🗓',  label: 'Month View' },
]

export default function Sidebar({ currentPage, onPage, currentHotel, onHotel, currentDate }) {
  const { user, logout, isAdmin } = useAuth()

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col h-screen flex-shrink-0">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="text-lg font-extrabold tracking-tight">
          Hotel<span className="text-brand">PMS</span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">Property Manager</div>
      </div>

      {/* Hotel switcher */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex gap-1.5">
          {[
            { id: 'square', icon: '🏨', label: 'Square' },
            { id: 'pool',   icon: '🏊', label: 'Pool' },
          ].map((h) => (
            <button
              key={h.id}
              onClick={() => onHotel(h.id)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                currentHotel === h.id
                  ? 'bg-brand text-white'
                  : 'text-gray-400 hover:bg-white/10'
              }`}
            >
              {h.icon} {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2">Views</div>
        {NAV.map((item) => {
          if (item.adminOnly && !isAdmin()) return null
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPage(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                active
                  ? 'bg-brand text-white font-semibold'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* User info + date */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-semibold text-white">{user?.label}</div>
            <div className="text-[10px] text-gray-400">
              {user?.role === 'admin' ? '🛡 Admin' : '👤 Staff'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-gray-400 hover:text-white text-lg transition-colors"
          >⏻</button>
        </div>
        <div className="text-[10px] text-gray-500">
          {currentDate?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </aside>
  )
}
