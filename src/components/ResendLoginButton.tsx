'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

interface ResendLoginButtonProps {
  clientEmail: string
  businessName?: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ResendLoginButton({ clientEmail, businessName }: ResendLoginButtonProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleResend() {
    setStatus('loading')
    setErrorMsg(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setErrorMsg('You must be logged in as admin.')
      setStatus('error')
      return
    }

    const res = await fetch('/api/resend-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ client_email: clientEmail, business_name: businessName }),
    })

    const result = await res.json()

    if (!res.ok) {
      setErrorMsg(result.error ?? 'Failed to send email.')
      setStatus('error')
      return
    }

    setStatus('success')

    // Reset back to idle after 4 seconds
    setTimeout(() => setStatus('idle'), 4000)
  }

  if (status === 'success') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Login email sent!
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleResend}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
      >
        {status === 'loading' ? (
          <>
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Resend Login Email
          </>
        )}
      </button>
      {status === 'error' && errorMsg && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
