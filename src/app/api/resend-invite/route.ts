import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bgordon@southpeak-systems.com'
const FROM_EMAIL = 'bgordon@southpeak-systems.com'
// SITE_URL is a server-side-only env var (no NEXT_PUBLIC_ prefix) so it is
// read at runtime per environment rather than baked in at build time.
// Set this in Vercel's Environment Variables dashboard.
const SITE_URL = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

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
  const { client_email, business_name } =
    (body ?? {}) as { client_email?: string; business_name?: string }

  if (!client_email) {
    return NextResponse.json({ error: 'client_email is required' }, { status: 400 })
  }

  const normalizedEmail = client_email.trim().toLowerCase()
  const clientName = (business_name ?? '').trim() || 'there'

  // ── Ensure auth user exists ───────────────────────────────────
  const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const targetUser = users?.find(
    (u) => (u.email ?? '').toLowerCase() === normalizedEmail
  )

  if (!targetUser) {
    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4).toUpperCase() +
      '!9'

    const { error: createError } = await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
    })

    if (createError) {
      return NextResponse.json(
        { error: `Could not create auth account: ${createError.message}` },
        { status: 500 }
      )
    }
    console.log(`[resend-invite] Created missing auth user for ${normalizedEmail}`)
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
    console.error('[resend-invite] generateLink error:', linkError.message)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const resetLink = linkData?.properties?.action_link ?? `${SITE_URL}/login?role=client`
  console.log(`[resend-invite] Reset link generated for ${normalizedEmail}`)

  // ── Send login email via Resend ──────────────────────────────
  const apiKey = process.env.RESEND_API_KEY
  console.log(`[resend-invite] RESEND_API_KEY present: ${!!apiKey}, length: ${apiKey?.length ?? 0}`)
  console.log(`[resend-invite] Sending email to: ${normalizedEmail} from: ${FROM_EMAIL}`)

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

  console.log(`[resend-invite] Resend response — data: ${JSON.stringify(emailData)}, error: ${JSON.stringify(emailError)}`)

  if (emailError) {
    const errMsg = (emailError as { message?: string; name?: string; statusCode?: number }).message
      ?? JSON.stringify(emailError)
    console.error('[resend-invite] Resend error detail:', JSON.stringify(emailError))
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  console.log(`[resend-invite] Email sent to ${normalizedEmail}. Resend ID: ${emailData?.id}`)
  return NextResponse.json({ success: true })
}
