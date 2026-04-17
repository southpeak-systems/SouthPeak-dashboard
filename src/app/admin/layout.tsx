import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'

const ADMIN_EMAIL = 'bgordon@southpeak-systems.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?role=admin')
  }

  // Hard-coded admin guard — only this email gets access
  if (session.user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" userEmail={session.user.email ?? ''} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
