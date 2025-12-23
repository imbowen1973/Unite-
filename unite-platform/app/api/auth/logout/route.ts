import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Clear the authentication cookie
  const response = NextResponse.json({ message: 'Logged out successfully' })
  response.cookies.delete('access_token')
  
  // Optionally, redirect to Microsoft's logout endpoint
  // const logoutUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
  // const postLogoutRedirectUri = 'http://localhost:3000'
  // return NextResponse.redirect(`${logoutUrl}?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`)
  
  return response
}
