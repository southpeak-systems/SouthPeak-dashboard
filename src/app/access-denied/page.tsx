'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

/**
 * /access-denied
 *
 * Shown when a user has a valid session but no matching active business row.
 * Signs them out immediately on mount so their session cannot be used further.
 */
export default function AccessDeniedPage() {
  useEffect(() => {
    createClient().auth.signOut()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Access denied</h2>
        <p className="text-sm text-gray-700 mb-1">
          Access denied. Contact SouthPeak Systems.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Your account is not linked to an active business. If you believe this
          is a mistake, please reach out:{' '}
          <a href="mailto:bgordon@southpeak-systems.com" className="text-blue-500 hover:underline">
            bgordon@southpeak-systems.com
          </a>
        </p>
        <a
          href="/login?role=client"
          className="inline-block px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Back to Login
        </a>
      </div>
    </div>
  )
}
