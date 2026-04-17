import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import ChangePasswordForm from '@/components/ChangePasswordForm'

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-gray-900 text-sm bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        {value || <span className="text-gray-400 italic">Not set</span>}
      </p>
    </div>
  )
}

export default async function SettingsPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  // Look up business by the logged-in user's email (case-insensitive)
  const userEmail = (session.user.email ?? '').toLowerCase()
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .ilike('client_email', userEmail)
    .single()

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <svg
          className="w-16 h-16 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Business Found</h2>
        <p className="text-gray-500 max-w-sm">
          Your account isn&apos;t linked to a business yet. Please contact SouthPeak Systems for
          assistance.
        </p>
      </div>
    )
  }

  const southpeakEmail = 'bgordon@southpeak-systems.com'
  const mailtoSubject = encodeURIComponent(`Change Request: ${business.business_name}`)
  const mailtoBody = encodeURIComponent(
    `Hi SouthPeak team,\n\nI'd like to request the following changes to my account:\n\nBusiness: ${business.business_name}\n\n[Please describe your changes here]\n\nThank you!`
  )
  const mailtoLink = `mailto:${southpeakEmail}?subject=${mailtoSubject}&body=${mailtoBody}`

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Your business configuration</p>
        </div>
        <a
          href={mailtoLink}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Request Changes
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Business Name" value={business.business_name} />
          <Field label="Phone Number" value={formatPhone(business.twilio_phone)} />
          <Field label="Booking Link" value={business.booking_link} />
          <Field label="Business Hours" value={business.hours} />
          <Field label="Location" value={business.location} />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Plan
            </p>
            <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Standard
              </span>
              <span className="text-gray-600 text-sm">$250/month</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Services
            </p>
            <p className="text-gray-900 text-sm bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 whitespace-pre-wrap">
              {business.services || <span className="text-gray-400 italic">Not set</span>}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            To update any of the information above, click{' '}
            <a href={mailtoLink} className="text-blue-500 hover:underline">
              Request Changes
            </a>{' '}
            and our team will update your configuration within 24 hours.
          </p>
        </div>
      </div>

      <ChangePasswordForm />
    </div>
  )
}
