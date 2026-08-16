import React from 'react'
import { SRC_BADGE_CLASSES } from '../../lib/theme'
import { srcLabel } from '../../lib/utils'

// Small colored tag showing a booking's source (Trip.com, Walk-in, etc.).
// Colors come from SRC_BADGE_CLASSES in src/lib/theme.js — edit there to
// restyle every source badge in the app at once.
//
//   <Badge source={booking.source} />           // normal size
//   <Badge source={booking.source} size="sm" />  // compact (Dashboard grid)
//
export default function Badge({ source, size = 'md', className = '' }) {
  const sizeClass = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'
  return (
    <span
      className={`font-bold rounded flex-shrink-0 ${sizeClass} ${SRC_BADGE_CLASSES[source] || ''} ${className}`}
    >
      {srcLabel(source)}
    </span>
  )
}
