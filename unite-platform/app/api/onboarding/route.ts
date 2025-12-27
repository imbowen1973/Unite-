import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { OnboardingService } from '@/lib/onboarding/onboarding-service'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

/**
 * Guest User Onboarding API
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const onboardingService = new OnboardingService(sharepointService, auditService)

    switch (action) {
      case 'invite': {
        const { email, displayName, guestType, committees, roles, permissions, personalMessage, accessExpiry } = body
        const invitation = await onboardingService.inviteGuestUser(
          user,
          email,
          displayName,
          guestType,
          committees,
          roles,
          permissions,
          { personalMessage, accessExpiry }
        )
        return NextResponse.json({ success: true, invitation })
      }

      case 'accept': {
        const { invitationToken, email } = body
        const result = await onboardingService.acceptInvitation(invitationToken, email)
        return NextResponse.json({ success: true, ...result })
      }

      case 'complete-step': {
        const { guestUserId, stepId } = body
        const guestUser = await onboardingService.completeOnboardingStep(guestUserId, stepId)
        return NextResponse.json({ success: true, guestUser })
      }

      case 'mfa-setup': {
        const { guestUserId, method } = body
        const mfaSetup = await onboardingService.configureMFA(guestUserId, method)
        return NextResponse.json({ success: true, mfaSetup })
      }

      case 'mfa-verify': {
        const { guestUserId, code } = body
        const result = await onboardingService.verifyMFACode(guestUserId, code)
        return NextResponse.json({ success: true, ...result })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Onboarding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
