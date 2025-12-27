import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'

/**
 * GET Appeal Details
 * Retrieves appeal information and associated documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { appealId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { appealId } = params

    const sharepointService = new SharePointService()

    // Get appeal details
    const appeal = await sharepointService.getListItem('appealsListId', appealId)
    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })
    }

    // Verify user has access to this appeal
    if (appeal.AppellantGuestUserId !== user.sub && !user.roles?.includes('staff')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get associated documents
    const documents = await sharepointService.getListItems('appealDocumentsListId', {
      filter: `AppealId eq '${appealId}'`,
      select: ['Id', 'FileName', 'FileSize', 'DocumentType', 'Status', 'UploadedAt', 'UploadedBy'],
    })

    return NextResponse.json({
      success: true,
      appeal: {
        id: appeal.Id,
        reference: appeal.Reference,
        appellantName: appeal.AppellantName,
        appellantEmail: appeal.AppellantEmail,
        appealType: appeal.AppealType,
        status: appeal.Status,
        requiredDocuments: appeal.RequiredDocuments ? JSON.parse(appeal.RequiredDocuments) : [],
        accessExpiresAt: appeal.AccessExpiresAt,
        submittedAt: appeal.SubmittedAt,
        createdAt: appeal.Created,
      },
      documents: documents.map(doc => ({
        id: doc.Id,
        fileName: doc.FileName,
        fileSize: doc.FileSize,
        documentType: doc.DocumentType,
        status: doc.Status,
        uploadedAt: doc.UploadedAt,
        uploadedBy: doc.UploadedBy,
      })),
    })
  } catch (error) {
    console.error('Get appeal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
