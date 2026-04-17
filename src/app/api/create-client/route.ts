import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bgordon@southpeak-systems.com'
const FROM_EMAIL = 'bgordon@southpeak-systems.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

export async function POST(request: Request) {
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
  const { client_email, business_id, business_name } =
    (body ?? {}) as { client_email?: string; business_id?: string; business_name?: string }

  if (!client_email || !business_id) {
    return NextResponse.json(
      { error: 'client_email and business_id are required' },
      { status: 400 }
    )
  }

  const normalizedEmail = client_email.trim().toLowerCase()
  const clientName = (business_name ?? '').trim() || 'there'

  // ── Create or find auth user ─────────────────────────────────
  const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = users?.find(
    (u) => (u.email ?? '').toLowerCase() === normalizedEmail
  )

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    console.log(`[create-client] Found existing auth user: ${userId}`)
  } else {
    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4).toUpperCase() +
      '!9'

    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
      })

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: createError?.message ?? 'Failed to create auth user' },
        { status: 500 }
      )
    }

    userId = newUser.user.id
    console.log(`[create-client] Created new auth user: ${userId}`)
  }

  // ── Link user → business (non-fatal if column doesn't exist yet) ──
  // The app uses client_email for all lookups; auth_user_id is a nice-to-have.
  // Run schema-additions.sql in Supabase to add the column if missing.
  const { error: updateError } = await serviceClient
    .from('businesses')
    .update({ auth_user_id: userId })
    .eq('id', business_id)

  if (updateError) {
    // Non-fatal: log but continue so the email still goes out
    console.warn('[create-client] Could not set auth_user_id (column may not exist yet):', updateError.message)
  }

  // ── Generate password-reset link ─────────────────────────────
  const { data: linkData, error: linkError } =
    await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${SITE_URL}/update-password`,
      },
    })

  if (linkError) {
    console.error('[create-client] generateLink error:', linkError.message)
    return NextResponse.json({
      success: true,
      warning:
        `Client account created but the invite email could not be sent (${linkError.message}). ` +
        `Use "Resend Login Email" on the client page to retry.`,
    })
  }

  const resetLink = linkData?.properties?.action_link ?? `${SITE_URL}/login?role=client`
  console.log(`[create-client] Reset link generated for ${normalizedEmail}`)

  // ── Send welcome email via Resend ────────────────────────────
  const apiKey = process.env.RESEND_API_KEY
  console.log(`[create-client] RESEND_API_KEY present: ${!!apiKey}, length: ${apiKey?.length ?? 0}`)
  console.log(`[create-client] Sending welcome email to: ${normalizedEmail} from: ${FROM_EMAIL}`)

  const resend = new Resend(apiKey)

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: normalizedEmail,
    subject: 'Welcome to SouthPeak Systems',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="margin-top: 0;">Welcome to SouthPeak Systems</h2>
        <p>Hi ${clientName},</p>
        <p>Your account has been created. Click the button below to set your password and access your dashboard:</p>
        <p style="margin: 28px 0;">
          <a href="${resetLink}"
             style="background: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
            Set My Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, contact us at
          <a href="mailto:bgordon@southpeak-systems.com" style="color: #3b82f6;">bgordon@southpeak-systems.com</a>.
        </p>
        <p style="color: #6b7280; font-size: 14px;">— The SouthPeak Systems Team</p>
      </div>
    `,
    text:
      `Hi ${clientName},\n\n` +
      `Your account has been created. Click the link below to set your password and access your dashboard:\n\n` +
      `${resetLink}\n\n` +
      `If you have any questions, contact us at bgordon@southpeak-systems.com.\n\n` +
      `— The SouthPeak Systems Team`,
  })

  console.log(`[create-client] Resend response — data: ${JSON.stringify(emailData)}, error: ${JSON.stringify(emailError)}`)

  if (emailError) {
    const errMsg = (emailError as { message?: string; name?: string; statusCode?: number }).message
      ?? JSON.stringify(emailError)
    console.error('[create-client] Resend error detail:', JSON.stringify(emailError))
    return NextResponse.json({
      success: true,
      warning:
        `Client account created but the welcome email could not be sent (${errMsg}). ` +
        `Use "Resend Login Email" on the client page to retry.`,
    })
  }

  console.log(`[create-client] Welcome email sent to ${normalizedEmail}. Resend ID: ${emailData?.id}`)
  return NextResponse.json({ success: true })
}
