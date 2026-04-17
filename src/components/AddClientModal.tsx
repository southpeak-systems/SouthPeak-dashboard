'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

interface AddClientModalProps {
  onClose: () => void
  onSuccess: () => void
}

const EMPTY_FORM = {
  business_name: '',
  twilio_phone: '',
  booking_link: '',
  services: '',
  hours: '',
  location: '',
  client_email: '',
}

type SaveStatus = 'idle' | 'saving' | 'done'

/** Format digits-only string as (XXX) XXX-XXXX */
function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Convert (XXX) XXX-XXXX display value to E.164 +1XXXXXXXXXX */
function toE164(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return display // already E.164 or empty — pass through
}

export default function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    if (name === 'twilio_phone') {
      setForm((prev) => ({ ...prev, twilio_phone: formatPhoneInput(value) }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSave() {
    // Client-side validation
    if (!form.business_name.trim()) { setError('Business name is required.'); return }
    if (form.twilio_phone.replace(/\D/g, '').length < 10) { setError('Please enter a complete 10-digit phone number.'); return }
    if (!form.client_email.trim()) { setError('Client email is required.'); return }

    setSaveStatus('saving')
    setError(null)
    setWarning(null)

    const supabase = createClient()

    // Step 1 — Insert the business row
    const { data: business, error: insertError } = await supabase
      .from('businesses')
      .insert({
        business_name: form.business_name.trim(),
        twilio_phone: toE164(form.twilio_phone.trim()),
        booking_link: form.booking_link.trim() || null,
        services: form.services.trim() || null,
        hours: form.hours.trim() || null,
        location: form.location.trim() || null,
        client_email: form.client_email.trim().toLowerCase(),
        plan: 'Standard',
        status: 'active',
      })
      .select('id')
      .single()

    if (insertError || !business) {
      setError(insertError?.message ?? 'Failed to save business.')
      setSaveStatus('idle')
      return
    }

    // Step 2 — Create the Supabase auth user + send invite email via API route
    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/create-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        client_email: form.client_email.trim().toLowerCase(),
        business_id: business.id,
        business_name: form.business_name.trim(),
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      // Auth user creation failed — but business was already created, so still call onSuccess
      // to refresh the list. Show a warning so admin knows to send login manually.
      setWarning(
        result.error ??
          'Business saved but the client login account could not be created. You can retry by removing and re-adding this client.'
      )
      setSaveStatus('done')
      return
    }

    if (result.warning) {
      setWarning(result.warning)
      setSaveStatus('done')
      return
    }

    // Full success — close and refresh after a brief moment
    setSaveStatus('done')
    setTimeout(() => {
      onSuccess()
    }, 800)
  }

  const loading = saveStatus === 'saving'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add New Client</h2>
            <p className="text-xs text-gray-400 mt-0.5">Standard plan — $250/month flat rate</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {saveStatus === 'done' && !warning && (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Client Added!</h3>
            <p className="text-sm text-gray-500">
              A password setup email has been sent to <strong>{form.client_email}</strong>.
            </p>
          </div>
        )}

        {/* Warning state (business saved but auth failed) */}
        {saveStatus === 'done' && warning && (
          <div className="px-6 py-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-4 mb-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Business saved with a warning</p>
                  <p className="text-sm text-yellow-700 mt-1">{warning}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onSuccess}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
              >
                Close & Refresh
              </button>
            </div>
          </div>
        )}

        {/* Form (hidden after success) */}
        {saveStatus !== 'done' && (
          <>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="business_name"
                  type="text"
                  required
                  value={form.business_name}
                  onChange={handleChange}
                  placeholder="Acme HVAC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Twilio Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twilio Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  name="twilio_phone"
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.twilio_phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Booking Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Link</label>
                <input
                  name="booking_link"
                  type="url"
                  value={form.booking_link}
                  onChange={handleChange}
                  placeholder="https://calendly.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Business Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours</label>
                <input
                  name="hours"
                  type="text"
                  value={form.hours}
                  onChange={handleChange}
                  placeholder="Mon-Fri 8am-6pm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Atlanta, GA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Client Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="client_email"
                  type="email"
                  required
                  value={form.client_email}
                  onChange={handleChange}
                  placeholder="owner@acmehvac.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Services */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Services</label>
                <textarea
                  name="services"
                  rows={3}
                  value={form.services}
                  onChange={handleChange}
                  placeholder="HVAC repair, AC installation, heating maintenance..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Plan — read-only display */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Standard
                  </span>
                  <span className="text-sm text-blue-700 font-medium">$250 / month flat rate</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <p className="text-xs text-gray-400">
                A password setup email will be sent to the client email above.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Client
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
