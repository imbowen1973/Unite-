import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { AppellantService } from '@/lib/appeals/appellant-service'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

/**
 * POST Submit Appeal
 * Finalizes and submits an appeal, triggering account deletion workflow
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
    const { appealId, guestUserId } = body

    if (!appealId || !guestUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const appellantService = new AppellantService(sharepointService, auditService)

    // Verify appeal exists
    const appeal = await sharepointService.getListItem('appealsListId', appealId)
    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })
    }

    // Verify user has access
    if (appeal.AppellantGuestUserId !== user.sub) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify all required documents are uploaded
    const requiredDocuments = appeal.RequiredDocuments ? JSON.parse(appeal.RequiredDocuments) : []
    const uploadedDocuments = await sharepointService.getListItems('appealDocumentsListId', {
      filter: `AppealId eq '${appealId}' and Status ne 'rejected'`,
    })

    const uploadedTypes = new Set(uploadedDocuments.map(doc => doc.DocumentType))
    const missingDocuments = requiredDocuments.filter((type: string) => !uploadedTypes.has(type))

    if (missingDocuments.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required documents',
          missingDocuments,
        },
        { status: 400 }
      )
    }

    // Submit the appeal
    const submission = await appellantService.submitAppeal(user, appealId, guestUserId)

    return NextResponse.json({
      success: true,
      submission: {
        confirmationReference: submission.confirmationReference,
        submittedAt: submission.submittedAt,
        documentIds: submission.documentIds,
      },
    })
  } catch (error) {
    console.error('Submit appeal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
