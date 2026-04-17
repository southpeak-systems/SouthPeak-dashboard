'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

const ADMIN_EMAIL = 'bgordon@southpeak-systems.com'

function LoginForm() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') === 'admin' ? 'admin' : 'client'
  const isAdminForm = role === 'admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()

    // Admin form: enforce the correct email before even attempting sign-in
    if (isAdminForm && normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
      setError('This login is for SouthPeak Systems admin only.')
      setLoading(false)
      return
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Sign in failed — no session returned. Please try again.')
      setLoading(false)
      return
    }

    const loggedInEmail = (data.session.user.email ?? '').toLowerCase()
    const isAdmin = loggedInEmail === ADMIN_EMAIL.toLowerCase()

    if (isAdminForm) {
      // Admin login form always goes to /admin
      router.push('/admin')
    } else {
      // Client login: verify their email is linked to a business
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .ilike('client_email', loggedInEmail)
        .single()

      if (bizError || !business) {
        // If it turns out to be the admin using the client form, send them to /admin
        if (isAdmin) {
          router.push('/admin')
          return
        }
        await supabase.auth.signOut()
        setError(
          'No business account found for this email. Please contact SouthPeak Systems at bgordon@southpeak-systems.com.'
        )
        setLoading(false)
        return
      }

      router.push('/dashboard')
    }
  }

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

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Role badge */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isAdminForm ? 'bg-blue-100' : 'bg-green-100'
              }`}
            >
              {isAdminForm ? (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isAdminForm ? 'Admin Login' : 'Client Login'}
              </h2>
              <p className="text-xs text-gray-500">
                {isAdminForm ? 'SouthPeak Systems owner access' : 'Business owner dashboard'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAdminForm ? ADMIN_EMAIL : 'you@yourbusiness.com'}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Client-only: no self-signup */}
          {!isAdminForm && (
            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have access?{' '}
                <a
                  href="mailto:bgordon@southpeak-systems.com?subject=Dashboard Access Request"
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Contact SouthPeak Systems
                </a>{' '}
                to get set up.
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-4">
          <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            ← Back to home
          </Link>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          &copy; {new Date().getFullYear()} SouthPeak Systems. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f1729]" />}>
      <LoginForm />
    </Suspense>
  )
}
