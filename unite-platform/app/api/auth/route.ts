// Microsoft Entra ID OAuth 2.0 / OIDC API endpoints
import { NextRequest, NextResponse } from 'next/server'

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
  
  // Store return URL in session or temporary storage
  // For now, we'll add it as a state parameter
  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64')
  
  const authUrl = new URL(`/oauth2/v2.0/authorize`)
  authUrl.searchParams.append('client_id', CLIENT_ID!)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.append('response_mode', 'query')
  authUrl.searchParams.append('scope', SCOPES)
  authUrl.searchParams.append('state', state)
  
  return NextResponse.redirect(authUrl.toString())
}

// Token exchange endpoint (callback)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }
    
    // Exchange authorization code for access token
    const tokenUrl = `/oauth2/v2.0/token`
    
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
      const errorData = await tokenResponse.json()
      return NextResponse.json({ error: 'Token exchange failed', details: errorData }, { status: 400 })
    }
    
    const tokenData = await tokenResponse.json()
    
    // In a real implementation, you would verify the ID token and create a session
    // For now, we'll just return the tokens
    const response = NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    })
    
    // Set the access token as an HTTP-only cookie (secure in production)
    response.cookies.set('access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
