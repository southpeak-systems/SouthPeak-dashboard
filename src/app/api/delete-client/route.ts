import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bgordon@southpeak-systems.com'

export async function DELETE(request: Request) {
  // ── Auth check ───────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const accessToken = authHeader.slice(7)

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user: callerUser }, error: callerError } =
    await serviceClient.auth.getUser(accessToken)

  if (callerError || !callerUser) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  if ((callerUser.email ?? '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
  }

  // ── Validate body ────────────────────────────────────────────
  const body = await request.json().catch(() => null)
  const { business_id } = (body ?? {}) as { business_id?: string }

  if (!business_id) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  // ── Delete conversations first (foreign key) ─────────────────
  const { error: convDeleteError } = await serviceClient
    .from('conversations')
    .delete()
    .eq('business_id', business_id)

  if (convDeleteError) {
    console.error('[delete-client] Error deleting conversations:', convDeleteError.message)
    return NextResponse.json({ error: convDeleteError.message }, { status: 500 })
  }

  // ── Delete the business ──────────────────────────────────────
  const { error: bizDeleteError } = await serviceClient
    .from('businesses')
    .delete()
    .eq('id', business_id)

  if (bizDeleteError) {
    console.error('[delete-client] Error deleting business:', bizDeleteError.message)
    return NextResponse.json({ error: bizDeleteError.message }, { status: 500 })
  }

  console.log(`[delete-client] Deleted business ${business_id} and its conversations.`)
  return NextResponse.json({ success: true })
}
