import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Real accounts now live in Supabase Auth (see supabase_auth_setup.sql for setup steps).
// Login usernames map to internal emails so the existing "username" UI doesn't need to change.
const emailFor = (username) => `${username.toLowerCase()}@hotelpms.local`

export const ROLE_PAGES = {
  admin: ['dashboard', 'rooms', 'bookings', 'prices', 'analytics', 'monthview'],
  user: ['dashboard', 'bookings', 'monthview'],
}

const AuthContext = createContext(null)

async function loadProfile(authUser) {
  if (!authUser) return null
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, label')
    .eq('id', authUser.id)
    .single()
  if (error || !data) return null
  return { username: authUser.email.split('@')[0], role: data.role, label: data.label }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = await loadProfile(session?.user)
      if (active) {
        setUser(profile)
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = await loadProfile(session?.user)
      if (active) setUser(profile)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = async (username, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFor(username),
      password,
    })
    if (error || !data.user) return false
    const profile = await loadProfile(data.user)
    if (!profile) {
      await supabase.auth.signOut()
      return false
    }
    setUser(profile)
    return true
  }

  const logout = () => {
    supabase.auth.signOut()
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
