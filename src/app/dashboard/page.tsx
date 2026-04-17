import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatCard from '@/components/StatCard'

const ADMIN_EMAIL = 'bgordon@southpeak-systems.com'

function PhoneIcon() {
  return (
    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    </div>
  )
}

function MessageIcon() {
  return (
    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  )
}

function CalendarIcon() {
  return (
    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

function OptOutIcon() {
  return (
    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?role=client')
  }

  const userEmail = (session.user.email ?? '').toLowerCase()
  const isAdmin = userEmail === ADMIN_EMAIL.toLowerCase()

  // If admin is previewing /dashboard, show a helpful notice instead of an error
  if (isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Preview Mode</h2>
        <p className="text-gray-500 max-w-sm mb-6">
          You&apos;re logged in as admin. This is the client dashboard — clients see their own
          business stats here. Head back to the Admin Dashboard to manage all clients.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Go to Admin Dashboard
        </Link>
      </div>
    )
  }

  // Look up the business linked to this client's email.
  // Use ilike for case-insensitive match and check that status is 'active'.
  // Deleted or inactive clients are redirected to /access-denied which signs
  // them out and shows an explanatory message.
  const { data: business } = await supabase
    .from('businesses')
    .select('id, business_name, plan, status')
    .ilike('client_email', userEmail)
    .maybeSingle()

  if (!business || business.status !== 'active') {
    redirect('/access-denied')
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Run all stat queries in parallel
  const [
    { count: missedCallsThisMonth },
    { count: conversationsStarted },
    { data: apptData },
    { count: optOuts },
  ] = await Promise.all([
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', startOfMonth),
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id),
    supabase
      .from('conversations')
      .select('appointments_booked')
      .eq('business_id', business.id),
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('opt_out_status', true),
  ])

  const totalAppointments = (apptData ?? []).reduce(
    (sum, row) => sum + (row.appointments_booked ?? 0),
    0
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{business.business_name}</h1>
        <p className="text-gray-500 mt-1">Your missed call recovery overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Missed Calls This Month"
          value={missedCallsThisMonth ?? 0}
          icon={<PhoneIcon />}
          accent="border-blue-500"
        />
        <StatCard
          title="Conversations Started"
          value={conversationsStarted ?? 0}
          icon={<MessageIcon />}
          accent="border-green-500"
        />
        <StatCard
          title="Appointments Booked"
          value={totalAppointments}
          icon={<CalendarIcon />}
          accent="border-purple-500"
        />
        <StatCard
          title="Opt-outs"
          value={optOuts ?? 0}
          icon={<OptOutIcon />}
          accent="border-red-400"
        />
      </div>
    </div>
  )
}
