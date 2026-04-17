import { createClient } from '@/lib/supabase-server'
import { formatDate, formatPhone } from '@/lib/utils'
import { notFound } from 'next/navigation'
import ConversationThread from '@/components/ConversationThread'
import ResendLoginButton from '@/components/ResendLoginButton'
import DeleteClientButton from '@/components/DeleteClientButton'

interface Message {
  role: 'assistant' | 'user'
  content: string
  timestamp?: string
}

interface Conversation {
  id: string
  customer_phone: string
  created_at: string
  last_message_at: string | null
  follow_up_count: number
  customer_replied_at: string | null
  opt_out_status: boolean
  appointments_booked: number
  message_history: Message[]
}

interface PageProps {
  params: { id: string }
}

function PlanBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      Standard — $250/mo
    </span>
  )
}

function ConversationRow({ conv }: { conv: Conversation }) {
  return (
    <details className="group">
      <summary className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors list-none">
        <svg
          className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm min-w-0">
          <div>
            <p className="font-medium text-gray-900 font-mono text-xs">
              {formatPhone(conv.customer_phone)}
            </p>
          </div>
          <div className="text-gray-500 text-xs">{formatDate(conv.created_at)}</div>
          <div className="text-gray-500 text-xs hidden sm:block">
            {conv.last_message_at ? formatDate(conv.last_message_at) : '—'}
          </div>
          <div className="hidden sm:flex items-center">
            <span className="text-gray-500 text-xs">{conv.follow_up_count ?? 0} follow-ups</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {conv.customer_replied_at ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Replied
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                No Reply
              </span>
            )}
            {conv.opt_out_status && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                Opted Out
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400 flex-shrink-0">
          {conv.appointments_booked ?? 0} appts
        </div>
      </summary>
      <div className="px-6 pb-6 bg-gray-50 border-t border-gray-100">
        <ConversationThread messages={conv.message_history ?? []} />
      </div>
    </details>
  )
}

export default async function ClientDetailPage({ params }: PageProps) {
  const supabase = createClient()

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', params.id)
    .single()

  if (bizError || !business) {
    notFound()
  }

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('business_id', params.id)
    .order('created_at', { ascending: false })

  const convList: Conversation[] = conversations ?? []

  const totalConversations = convList.length
  const optOuts = convList.filter((c) => c.opt_out_status)
  const totalAppointments = convList.reduce((sum, c) => sum + (c.appointments_booked ?? 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <a
          href="/admin/clients"
          className="text-sm text-blue-500 hover:text-blue-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </a>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold text-gray-900">{business.business_name}</h1>
          <DeleteClientButton businessId={params.id} businessName={business.business_name} />
        </div>
      </div>

      {/* Business Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Business Details</h2>
          {business.client_email && (
            <ResendLoginButton clientEmail={business.client_email} businessName={business.business_name} />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Phone</p>
            <p className="text-gray-900 font-mono">{formatPhone(business.twilio_phone)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Client Email</p>
            <p className="text-gray-900">{business.client_email ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Plan</p>
            <PlanBadge />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Status</p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                business.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  business.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              {business.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
              Location
            </p>
            <p className="text-gray-900">{business.location ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Hours</p>
            <p className="text-gray-900">{business.hours ?? '—'}</p>
          </div>
          {business.booking_link && (
            <div className="sm:col-span-2">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                Booking Link
              </p>
              <a
                href={business.booking_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline truncate block"
              >
                {business.booking_link}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5 border-t-4 border-blue-500">
          <p className="text-sm text-gray-500">Total Conversations</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalConversations}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 border-t-4 border-red-400">
          <p className="text-sm text-gray-500">Opt-outs</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{optOuts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 border-t-4 border-purple-500">
          <p className="text-sm text-gray-500">Appointments Booked</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalAppointments}</p>
        </div>
      </div>

      {/* Opt-out List */}
      {optOuts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Opt-out List</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer Phone
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {optOuts.map((conv) => (
                  <tr key={conv.id}>
                    <td className="px-6 py-4 font-mono text-sm text-gray-700">
                      {formatPhone(conv.customer_phone)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(conv.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conversation History */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Conversation History</h2>
          <p className="text-sm text-gray-500 mt-0.5">Click a row to expand the message thread</p>
        </div>

        {convList.length === 0 ? (
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
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {convList.map((conv) => (
              <ConversationRow key={conv.id} conv={conv} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
