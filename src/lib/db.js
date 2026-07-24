import { supabase } from './supabase'

// ── Rooms ─────────────────────────────────────────────────────────────────────
export async function fetchRooms(hotelId) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('number')
  if (error) throw error
  return data
}

export async function updateRoomStatus(roomId, status) {
  const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
  if (error) throw error
}

export async function addRoom(hotelId, number, type, label) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ hotel_id: hotelId, number, type, label, status: 'vacant' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeRoom(roomId) {
  const { error } = await supabase.from('rooms').delete().eq('id', roomId)
  if (error) throw error
}

// ── Bookings ──────────────────────────────────────────────────────────────────
export async function fetchBookings(hotelId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('checkin')
  if (error) throw error
  return data
}

export async function upsertBooking(booking) {
  const { data, error } = await supabase
    .from('bookings')
    .upsert(booking)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBooking(id) {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw error
}

export async function updateBookingField(id, fields) {
  const { error } = await supabase.from('bookings').update(fields).eq('id', id)
  if (error) throw error
}

// ── Prices ────────────────────────────────────────────────────────────────────
export async function fetchPrices() {
  const { data, error } = await supabase.from('prices').select('*')
  if (error) throw error
  // Convert to flat map: { 'standard_T': 1500, ... }
  const map = {}
  data.forEach((p) => { map[`${p.room_type}_${p.source}`] = p.rate })
  return map
}

export async function updatePrice(roomType, source, rate) {
  const { error } = await supabase
    .from('prices')
    .upsert({ room_type: roomType, source, rate })
  if (error) throw error
}

// ── Add-on rates ──────────────────────────────────────────────────────────────
export async function fetchAddons() {
  const { data, error } = await supabase.from('addon_rates').select('*')
  if (error) throw error
  const map = {}
  data.forEach((a) => { map[a.id] = a.rate })
  return map
}

export async function updateAddon(id, rate) {
  const { error } = await supabase.from('addon_rates').upsert({ id, rate })
  if (error) throw error
}
