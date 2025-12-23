// Microsoft Entra ID Authentication Service
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys')
)

export interface TokenPayload {
  iss: string // issuer
  sub: string // subject (user id)
  aud: string // audience (client id)
  exp: number // expiration time
  nbf: number // not before
  iat: number // issued at
  oid: string // object id (user's unique id in Entra ID)
  upn: string // user principal name
  name: string // display name
  email?: string // email address
  roles: string[] // user roles
  tid: string // tenant id
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const verified = await jwtVerify(token, JWKS, {
      issuer: ['https://sts.windows.net/{tenantid}/', 'https://login.microsoftonline.com/{tenantid}/v2.0'],
    })
    return verified.payload as TokenPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    throw new Error('Invalid token')
  }
}

// Role-based access control
export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Contributor = 'Contributor',
  Viewer = 'Viewer',
}

export function hasRole(payload: TokenPayload, role: UserRole): boolean {
  return payload.roles.includes(role)
}

export function hasAnyRole(payload: TokenPayload, roles: UserRole[]): boolean {
  return roles.some(role => payload.roles.includes(role))
}
