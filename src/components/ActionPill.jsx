import React from 'react'
import { PILL_BASE, PILL_VARIANTS } from '../lib/theme'

// Small rounded action button used throughout RoomModal, BookingsPage, etc.
// To change how ALL pills of a given color look, edit PILL_VARIANTS in
// src/lib/theme.js — you don't need to touch this file or any page.
//
//   <ActionPill variant="green" onClick={...}>✅ Mark arrived</ActionPill>
//
export default function ActionPill({ variant = 'gray', className = '', children, ...props }) {
  return (
    <button
      className={`${PILL_BASE} ${PILL_VARIANTS[variant] || PILL_VARIANTS.gray} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
