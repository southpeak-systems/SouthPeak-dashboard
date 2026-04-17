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

  // ── Fetch business to get client email (for auth user lookup) ─
  const { data: business, error: fetchError } = await serviceClient
    .from('businesses')
    .select('client_email, auth_user_id')
    .eq('id', business_id)
    .single()

  if (fetchError || !business) {
    console.error('[delete-client] Could not fetch business:', fetchError?.message)
    return NextResponse.json({ error: fetchError?.message ?? 'Business not found' }, { status: 404 })
  }

  // ── Delete conversations first (foreign key constraint) ──────
  const { error: convDeleteError } = await serviceClient
    .from('conversations')
    .delete()
    .eq('business_id', business_id)

  if (convDeleteError) {
    console.error('[delete-client] Error deleting conversations:', convDeleteError.message)
    return NextResponse.json({ error: convDeleteError.message }, { status: 500 })
  }

  // ── Delete the business row ──────────────────────────────────
  const { error: bizDeleteError } = await serviceClient
    .from('businesses')
    .delete()
    .eq('id', business_id)

  if (bizDeleteError) {
    console.error('[delete-client] Error deleting business:', bizDeleteError.message)
    return NextResponse.json({ error: bizDeleteError.message }, { status: 500 })
  }

  console.log(`[delete-client] Deleted business ${business_id} and its conversations.`)

  // ── Delete the Supabase auth user so they can no longer log in ─
  // Resolve the auth user ID: prefer the stored auth_user_id, fall back to
  // a lookup by email in case the column was never populated.
  let authUserId: string | null = business.auth_user_id ?? null

  if (!authUserId && business.client_email) {
    const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
    const match = users?.find(
      (u) => (u.email ?? '').toLowerCase() === business.client_email.toLowerCase()
    )
    authUserId = match?.id ?? null
  }

  if (authUserId) {
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(authUserId)
    if (authDeleteError) {
      // Non-fatal: the business data is gone; log but don't fail the request.
      console.warn('[delete-client] Could not delete auth user:', authDeleteError.message)
    } else {
      console.log(`[delete-client] Deleted auth user ${authUserId}.`)
    }
  } else {
    console.warn('[delete-client] No auth user found to delete for business', business_id)
  }

  return NextResponse.json({ success: true })
}
