import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

/**
 * POST Upload Appeal Document
 * Handles document uploads for appeal submissions
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const appealId = formData.get('appealId') as string
    const documentType = formData.get('documentType') as string

    if (!file || !appealId || !documentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG' }, { status: 400 })
    }

    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)

    // Verify appeal exists and user has access
    const appeal = await sharepointService.getListItem('appealsListId', appealId)
    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })
    }

    if (appeal.AppellantGuestUserId !== user.sub && !user.roles?.includes('staff')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if appeal is still open for submissions
    if (appeal.Status === 'submitted' || appeal.Status === 'decided' || appeal.Status === 'closed') {
      return NextResponse.json({ error: 'Appeal is no longer accepting documents' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to SharePoint document library
    const uploadResult = await sharepointService.uploadFile(
      'AppealDocuments',
      `${appealId}/${file.name}`,
      buffer,
      file.type
    )

    // Create document record
    const documentRecord = await sharepointService.createListItem('appealDocumentsListId', {
      AppealId: appealId,
      FileName: file.name,
      FileSize: file.size,
      FileType: file.type,
      DocumentType: documentType,
      FilePath: uploadResult.serverRelativeUrl,
      Status: 'uploaded',
      UploadedBy: user.upn,
      UploadedAt: new Date().toISOString(),
    })

    // Audit log
    await auditService.logAction(
      user,
      'appeal-document-upload',
      'appeal',
      appealId,
      {
        fileName: file.name,
        fileSize: file.size,
        documentType,
        documentId: documentRecord.Id,
      },
      'success'
    )

    return NextResponse.json({
      success: true,
      document: {
        id: documentRecord.Id,
        fileName: file.name,
        fileSize: file.size,
        documentType,
        uploadedAt: documentRecord.UploadedAt,
      },
    })
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
