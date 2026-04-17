'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

type Stage = 'waiting' | 'ready' | 'saving' | 'done' | 'error' | 'invalid'

export default function UpdatePasswordPage() {
  const [stage, setStage] = useState<Stage>('waiting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Supabase fires PASSWORD_RECOVERY when it detects the recovery token
    // in the URL hash (#access_token=...&type=recovery). This happens
    // automatically on page load when the browser client initialises.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStage('ready')
        }
        // If they somehow land here already signed in without a recovery token
        // (e.g. typing the URL directly), send them home.
        if (event === 'SIGNED_IN' && stage === 'waiting') {
          // Give the recovery check 500ms to fire first
          setTimeout(() => {
            setStage((current) => (current === 'waiting' ? 'invalid' : current))
          }, 500)
        }
      }
    )

    // Fallback: if no auth event fires within 3 seconds, show an error
    const timeout = setTimeout(() => {
      setStage((current) => (current === 'waiting' ? 'invalid' : current))
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setStage('saving')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message)
      setStage('ready')
      return
    }

    setStage('done')

    // Sign out so the client lands on a clean login screen
    await supabase.auth.signOut()

    setTimeout(() => {
      router.push('/login?role=client')
    }, 2000)
  }

  // ── Waiting for recovery token ─────────────────────────────────────
  if (stage === 'waiting') {
    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center px-4">
        <div className="text-center">
          <span className="inline-block w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-blue-300 text-sm">Verifying your link…</p>
        </div>
      </div>
    )
  }

  // ── Invalid / expired link ─────────────────────────────────────────
  if (stage === 'invalid') {
    return (
      <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Link expired or invalid</h2>
          <p className="text-sm text-gray-500 mb-6">
            This password setup link has expired or already been used. Contact{' '}
            <a href="mailto:bgordon@southpeak-systems.com" className="text-blue-500 hover:underline">
              bgordon@southpeak-systems.com
            </a>{' '}
            to get a new one.
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

  // ── Password set successfully ───────────────────────────────────────
  if (stage === 'done') {
    return (
      <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Password set!</h2>
          <p className="text-sm text-gray-500">Taking you to login…</p>
        </div>
      </div>
    )
  }

  // ── Set password form (stage === 'ready' | 'saving') ───────────────
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">SouthPeak Systems</h1>
          <p className="text-blue-400 mt-1 text-sm font-medium tracking-widest uppercase">
            Missed Call Recovery
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Set Your Password</h2>
              <p className="text-xs text-gray-500">Choose a password to access your dashboard</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={stage === 'saving'}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {stage === 'saving' ? 'Saving…' : 'Set Password & Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          &copy; {new Date().getFullYear()} SouthPeak Systems. All rights reserved.
        </p>
      </div>
    </div>
  )
}
