import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAIL = 'bgordon@southpeak-systems.com'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  // ── Public routes ─────────────────────────────────────────
  // Landing page — always public
  if (pathname === '/') {
    return supabaseResponse
  }

  // Login pages — public, but redirect already-authenticated clients
  // away so they don't have to re-login. Admins are allowed through
  // so they can test the client login view.
  if (pathname.startsWith('/login')) {
    if (session && !isAdmin) {
      // Client already logged in — send them straight to their dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Password update page — must be public so the recovery token in the
  // URL hash can be exchanged client-side before any session cookie exists.
  if (pathname.startsWith('/update-password')) {
    return supabaseResponse
  }

  // ── Protected routes — require a session ─────────────────
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // /admin — only for the hardcoded admin email
  // Clients trying to reach /admin are redirected to /dashboard
  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // /dashboard — open to everyone who is authenticated.
  // Admins CAN visit /dashboard (they see an admin-preview notice).
  // No redirect needed here.

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
