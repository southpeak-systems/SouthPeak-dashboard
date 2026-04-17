import { createClient } from '@/lib/supabase-server'
import StatCard from '@/components/StatCard'
import { formatDate, formatPhone } from '@/lib/utils'

function ClientsIcon() {
  return (
    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </div>
  )
}

function ConversationIcon() {
  return (
    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </div>
  )
}

function PhoneIcon() {
  return (
    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    </div>
  )
}

function CalendarIcon() {
  return (
    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const supabase = createClient()

  // Total clients
  const { count: totalClients } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })

  // Start of current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Conversations this month
  const { count: conversationsThisMonth } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth)

  // Total conversations (= missed calls recovered)
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })

  // Total appointments booked
  const { data: appointmentsData } = await supabase
    .from('conversations')
    .select('appointments_booked')

  const totalAppointments = (appointmentsData ?? []).reduce(
    (sum, row) => sum + (row.appointments_booked ?? 0),
    0
  )

  // Recent activity: last 5 conversations with business name
  const { data: recentConversations } = await supabase
    .from('conversations')
    .select('id, customer_phone, last_message_at, created_at, business_id, businesses(business_name)')
    .order('last_message_at', { ascending: false })
    .limit(5)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of all client activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Total Clients"
          value={totalClients ?? 0}
          icon={<ClientsIcon />}
          accent="border-blue-500"
        />
        <StatCard
          title="Conversations This Month"
          value={conversationsThisMonth ?? 0}
          icon={<ConversationIcon />}
          accent="border-green-500"
        />
        <StatCard
          title="Missed Calls Recovered"
          value={totalConversations ?? 0}
          icon={<PhoneIcon />}
          accent="border-orange-500"
        />
        <StatCard
          title="Appointments Booked"
          value={totalAppointments}
          icon={<CalendarIcon />}
          accent="border-purple-500"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500 mt-0.5">Last 5 conversations across all clients</p>
        </div>

        {!recentConversations || recentConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-gray-500 font-medium">No conversations yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Conversations will appear here once clients start receiving missed calls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Last Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentConversations.map((conv) => {
                  const business = (conv.businesses as unknown) as { business_name: string } | null
                  return (
                    <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {business?.business_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {formatPhone(conv.customer_phone)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {conv.last_message_at
                          ? formatDate(conv.last_message_at)
                          : formatDate(conv.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
