'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { formatDate, formatPhone } from '@/lib/utils'

interface Conversation {
  id: string
  customer_phone: string
  created_at: string
  last_message_at: string | null
  customer_replied_at: string | null
  follow_up_count: number
  opt_out_status: boolean
}

export default function ConversationsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/')
        return
      }

      // Look up business by the logged-in user's email (case-insensitive)
      const userEmail = (session.user.email ?? '').toLowerCase()
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .ilike('client_email', userEmail)
        .single()

      if (!business) {
        setLoading(false)
        return
      }

      const { data: convs } = await supabase
        .from('conversations')
        .select(
          'id, customer_phone, created_at, last_message_at, customer_replied_at, follow_up_count, opt_out_status'
        )
        .eq('business_id', business.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      setConversations(convs ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-gray-500 mt-1">All missed-call conversations for your business</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
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
              Your missed call conversations will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Last Message
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Replied?
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Follow-ups
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {conversations.map((conv) => (
                  <tr
                    key={conv.id}
                    onClick={() => router.push(`/dashboard/conversations/${conv.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 font-mono text-xs">
                      {formatPhone(conv.customer_phone)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(conv.created_at)}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {conv.last_message_at ? formatDate(conv.last_message_at) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {conv.customer_replied_at ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{conv.follow_up_count ?? 0}</td>
                    <td className="px-6 py-4">
                      {conv.opt_out_status ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Opted Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
