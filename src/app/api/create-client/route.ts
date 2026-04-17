import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL   = 'bgordon@southpeak-systems.com'
const FROM_EMAIL    = 'bgordon@southpeak-systems.com'
const DASHBOARD_URL = 'https://south-peak-dashboard-o6nml20nh-southpeak-systems-projects.vercel.app'

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
  const clientName      = (business_name ?? '').trim() || 'there'

  // ── Generate a unique temp password ──────────────────────────
  const tempPassword = 'SP' + Math.random().toString(36).slice(-6).toUpperCase() + '!1'

  // ── Create or find auth user ─────────────────────────────────
  const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = users?.find(
    (u) => (u.email ?? '').toLowerCase() === normalizedEmail
  )

  let userId: string

  if (existingUser) {
    const { error: resetError } = await serviceClient.auth.admin.updateUserById(existingUser.id, {
      password: tempPassword,
    })
    if (resetError) {
      console.error('[create-client] Could not reset password:', resetError.message)
      return NextResponse.json({ error: resetError.message }, { status: 500 })
    }
    userId = existingUser.id
    console.log(`[create-client] Reset password for existing user: ${userId}`)
  } else {
    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email:         normalizedEmail,
        password:      tempPassword,
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
  const { error: updateError } = await serviceClient
    .from('businesses')
    .update({ auth_user_id: userId })
    .eq('id', business_id)

  if (updateError) {
    console.warn('[create-client] Could not set auth_user_id:', updateError.message)
  }

  // ── Send welcome email with credentials via Resend ────────────
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data: emailData, error: emailError } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      normalizedEmail,
    subject: 'Welcome to SouthPeak Systems - Your Login Info',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="margin-top: 0;">Welcome to SouthPeak Systems</h2>
        <p>Hi ${clientName},</p>
        <p>Your dashboard account has been created. Here are your login credentials:</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; font-size: 14px;"><strong>Login URL:</strong><br>
            <a href="${DASHBOARD_URL}/login" style="color: #3b82f6;">${DASHBOARD_URL}/login</a>
          </p>
          <p style="margin: 8px 0 8px; font-size: 14px;"><strong>Email:</strong> ${normalizedEmail}</p>
          <p style="margin: 8px 0 0; font-size: 14px;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>

        <p>Please log in and change your password after your first login using the <strong>Settings</strong> page in your dashboard.</p>

        <p style="margin: 28px 0;">
          <a href="${DASHBOARD_URL}/login"
             style="background: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
            Go to Dashboard
          </a>
        </p>

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
      `Your dashboard account has been created. Here are your login credentials:\n\n` +
      `Login URL: ${DASHBOARD_URL}/login\n` +
      `Email: ${normalizedEmail}\n` +
      `Temporary Password: ${tempPassword}\n\n` +
      `Please log in and change your password after your first login using the Settings page.\n\n` +
      `If you have any questions, contact us at bgordon@southpeak-systems.com.\n\n` +
      `— The SouthPeak Systems Team`,
  })

  console.log(`[create-client] Resend response — data: ${JSON.stringify(emailData)}, error: ${JSON.stringify(emailError)}`)

  if (emailError) {
    const errMsg = (emailError as { message?: string }).message ?? JSON.stringify(emailError)
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
