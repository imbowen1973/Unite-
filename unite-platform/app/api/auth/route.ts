// Microsoft Entra ID OAuth 2.0 / OIDC API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import crypto from 'crypto'

// Configuration from environment variables
const AUTHORITY = process.env.MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common'
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
const SCOPES = process.env.MICROSOFT_SCOPES || 'openid profile email'

// Login endpoint - redirects to Microsoft login
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const returnUrl = searchParams.get('returnUrl') || '/'

  // Generate CSRF token for state validation
  const csrfToken = crypto.randomUUID()

  // Store return URL and CSRF token in state parameter
  const state = Buffer.from(JSON.stringify({ returnUrl, csrfToken })).toString('base64')

  // Construct proper authorization URL with authority base
  const authUrl = new URL(`${AUTHORITY}/oauth2/v2.0/authorize`)
  authUrl.searchParams.append('client_id', CLIENT_ID!)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.append('response_mode', 'query')
  authUrl.searchParams.append('scope', SCOPES)
  authUrl.searchParams.append('state', state)

  // Store CSRF token in HTTP-only cookie for validation
  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set('oauth_state', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}

// Token exchange endpoint (callback)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, state } = body

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }

    // Validate state parameter (CSRF protection)
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        const storedCsrfToken = request.cookies.get('oauth_state')?.value

        if (!storedCsrfToken || stateData.csrfToken !== storedCsrfToken) {
          return NextResponse.json({ error: 'Invalid state parameter - CSRF token mismatch' }, { status: 403 })
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
      }
    }

    // Exchange authorization code for access token with proper authority URL
    const tokenUrl = `${AUTHORITY}/oauth2/v2.0/token`

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        code: code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenResponse.status)
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()

    // Verify the ID token before trusting it
    try {
      const verifiedToken = await verifyToken(tokenData.id_token || tokenData.access_token)

      // Token is valid, create session
      const response = NextResponse.json({
        user: {
          oid: verifiedToken.oid,
          upn: verifiedToken.upn,
          name: verifiedToken.name,
          email: verifiedToken.email,
        },
        expires_in: tokenData.expires_in,
      })

      // Set the access token as an HTTP-only cookie (secure in production)
      response.cookies.set('access_token', tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokenData.expires_in || 3600,
        path: '/',
      })

      // Clear the CSRF token cookie
      response.cookies.delete('oauth_state')

      return response
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError)
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
