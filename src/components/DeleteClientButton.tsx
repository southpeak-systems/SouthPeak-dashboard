'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

interface DeleteClientButtonProps {
  businessId: string
  businessName: string
}

type Status = 'idle' | 'confirming' | 'deleting' | 'error'

export default function DeleteClientButton({ businessId, businessName }: DeleteClientButtonProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setStatus('deleting')
    setErrorMsg(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setErrorMsg('You must be logged in as admin.')
      setStatus('error')
      return
    }

    const res = await fetch('/api/delete-client', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ business_id: businessId }),
    })

    const result = await res.json()

    if (!res.ok) {
      setErrorMsg(result.error ?? 'Failed to delete client.')
      setStatus('error')
      return
    }

    // Redirect back to the clients list
    router.push('/admin/clients')
    router.refresh()
  }

  // ── Confirmation dialog ───────────────────────────────────────
  if (status === 'confirming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStatus('idle')} />

        {/* Dialog */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Delete Client</h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-900">{businessName}</span>?
                This will permanently remove the business and all its conversation history.
                This cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setStatus('idle')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Yes, Delete Client
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Deleting state ────────────────────────────────────────────
  if (status === 'deleting') {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-400 text-sm font-medium rounded-lg opacity-70"
      >
        <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
        Deleting…
      </button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => setStatus('confirming')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Client
      </button>
      {status === 'error' && errorMsg && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
