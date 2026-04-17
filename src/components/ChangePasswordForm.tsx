'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

type Status = 'idle' | 'saving' | 'success' | 'error'

export default function ChangePasswordForm() {
  const [current,  setCurrent]  = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [status,   setStatus]   = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length < 8) {
      setErrorMsg('New password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('New passwords do not match.')
      return
    }

    setStatus('saving')

    // Re-authenticate with the current password first so we can be sure
    // the person at the keyboard is the account owner.
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      setErrorMsg('No active session found. Please log in again.')
      setStatus('error')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    session.user.email,
      password: current,
    })

    if (signInError) {
      setErrorMsg('Current password is incorrect.')
      setStatus('error')
      return
    }

    // Current password verified — now update to the new one
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setErrorMsg(updateError.message)
      setStatus('error')
      return
    }

    setStatus('success')
    setCurrent('')
    setPassword('')
    setConfirm('')

    // Reset success banner after 5 seconds
    setTimeout(() => setStatus('idle'), 5000)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Change Password</h2>
      <p className="text-sm text-gray-500 mb-5">
        If you received a temporary password in your welcome email, update it here.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label htmlFor="current" className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Your current password"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Password updated successfully.
          </div>
        )}

        {(status === 'error' || errorMsg) && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {status === 'saving' ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating…
            </>
          ) : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
