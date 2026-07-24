import React, { createContext, useContext, useState, useEffect } from 'react'

// Accounts are stored here. In production you could move these to Supabase auth.
const ACCOUNTS = {
  admin: { password: 'admin123', role: 'admin', label: 'Administrator' },
  staff: { password: 'staff123', role: 'user',  label: 'Front Desk' },
}

export const ROLE_PAGES = {
  admin: ['dashboard', 'rooms', 'bookings', 'prices', 'analytics', 'monthview'],
  user:  ['dashboard', 'bookings', 'monthview'],
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const s = sessionStorage.getItem('hotel_pms_session')
      if (s) setUser(JSON.parse(s))
    } catch {}
    setLoading(false)
  }, [])

  const login = (username, password) => {
    const account = ACCOUNTS[username.toLowerCase()]
    if (!account || account.password !== password) return false
    const u = { username: username.toLowerCase(), role: account.role, label: account.label }
    setUser(u)
    try { sessionStorage.setItem('hotel_pms_session', JSON.stringify(u)) } catch {}
    return true
  }

  const logout = () => {
    setUser(null)
    try { sessionStorage.removeItem('hotel_pms_session') } catch {}
  }

  const isAdmin = () => user?.role === 'admin'
  const canAccess = (page) => ROLE_PAGES[user?.role]?.includes(page) ?? false

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
