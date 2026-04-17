import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import ConversationThread from '@/components/ConversationThread'
import { formatPhone, formatDate } from '@/lib/utils'

interface Message {
  role: 'assistant' | 'user'
  content: string
  timestamp?: string
}

interface PageProps {
  params: { id: string }
}

export default async function ConversationDetailPage({ params }: PageProps) {
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
    .select('id')
    .ilike('client_email', userEmail)
    .single()

  if (!business) {
    redirect('/dashboard')
  }

  // Fetch the conversation, verifying it belongs to this business
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', params.id)
    .eq('business_id', business.id)
    .single()

  if (error || !conversation) {
    notFound()
  }

  const messages: Message[] = conversation.message_history ?? []

  return (
    <div>
      <a
        href="/dashboard/conversations"
        className="text-sm text-blue-500 hover:text-blue-700 mb-4 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Conversations
      </a>

      <div className="mt-4">
        {/* Header card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-mono">
                {formatPhone(conversation.customer_phone)}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Started {formatDate(conversation.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {conversation.customer_replied_at ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  Customer Replied
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
                  No Reply Yet
                </span>
              )}
              {conversation.opt_out_status && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  Opted Out
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 text-sm">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Follow-ups Sent
              </p>
              <p className="text-gray-900 font-semibold">{conversation.follow_up_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Appointments Booked
              </p>
              <p className="text-gray-900 font-semibold">{conversation.appointments_booked ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Last Message
              </p>
              <p className="text-gray-900">
                {conversation.last_message_at ? formatDate(conversation.last_message_at) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Messages
              </p>
              <p className="text-gray-900 font-semibold">{messages.length}</p>
            </div>
          </div>
        </div>

        {/* Thread */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Message Thread</h2>
          </div>
          <div className="px-6">
            <ConversationThread messages={messages} />
          </div>
        </div>
      </div>
    </div>
  )
}
