import React from 'react'

export default function QRScanner() {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-2xl border border-gray-800 max-w-sm w-full mx-auto text-white">
      <h2 className="text-lg font-bold text-indigo-400 mb-2">Device pairing unavailable</h2>
      <p className="text-xs text-gray-400 text-center">
        QR pairing is not configured. Sign in with the same account on desktop and mobile.
      </p>
    </div>
  )
}
