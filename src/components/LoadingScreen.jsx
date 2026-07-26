import React from 'react'

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-20">
      <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
      <div className="text-sm text-gray-400">{message}</div>
    </div>
  )
}
