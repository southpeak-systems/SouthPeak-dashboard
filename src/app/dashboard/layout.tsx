import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?role=client')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="client" userEmail={session.user.email ?? ''} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
