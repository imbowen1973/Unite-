import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, UserRole, hasAnyRole } from '@/lib/auth'

// Middleware to protect routes with authentication
export async function middleware(request: NextRequest) {
  // Allow public routes
  if (request.nextUrl.pathname.startsWith('/api/auth') || 
      request.nextUrl.pathname === '/api/health' ||
      request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  // Extract token from header or cookies
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' }, 
      { status: 401 }
    )
  }

  try {
    const payload = await verifyToken(token)
    
    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.oid)
    requestHeaders.set('x-user-name', payload.name)
    requestHeaders.set('x-user-roles', payload.roles.join(','))
    requestHeaders.set('x-user-upn', payload.upn)
    
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    })
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid or expired token' }, 
      { status: 401 }
    )
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
