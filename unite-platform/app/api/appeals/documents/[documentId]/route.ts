import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

/**
 * DELETE Appeal Document
 * Removes a document from an appeal submission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
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

    const { documentId } = params

    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)

    // Get document details
    const document = await sharepointService.getListItem('appealDocumentsListId', documentId)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get associated appeal
    const appeal = await sharepointService.getListItem('appealsListId', document.AppealId)
    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })
    }

    // Verify user has access
    if (appeal.AppellantGuestUserId !== user.sub && !user.roles?.includes('staff')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if appeal is still open for modifications
    if (appeal.Status === 'submitted' || appeal.Status === 'decided' || appeal.Status === 'closed') {
      return NextResponse.json({ error: 'Cannot delete documents from submitted appeal' }, { status: 400 })
    }

    // Delete file from SharePoint
    try {
      await sharepointService.deleteFile(document.FilePath)
    } catch (fileError) {
      console.warn('File deletion warning:', fileError)
      // Continue even if file deletion fails - might already be deleted
    }

    // Delete document record
    await sharepointService.deleteListItem('appealDocumentsListId', documentId)

    // Audit log
    await auditService.logAction(
      user,
      'appeal-document-delete',
      'appeal',
      appeal.Id,
      {
        documentId,
        fileName: document.FileName,
        documentType: document.DocumentType,
      },
      'success'
    )

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
