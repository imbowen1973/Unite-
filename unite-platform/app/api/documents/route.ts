// Documents API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'

// Initialize services
const sharepointService = new SharePointService({
  tenantUrl: process.env.SHAREPOINT_TENANT_URL || '',
  clientId: process.env.SHAREPOINT_CLIENT_ID || '',
  clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
  siteId: process.env.SHAREPOINT_SITE_ID || ''
})

const auditService = new AuditService(sharepointService)
const accessControlService = new AccessControlService(sharepointService, auditService)
const documentWorkflowService = new DocumentWorkflowService(
  sharepointService,
  auditService,
  accessControlService
)

export async function POST(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const user = await verifyToken(token)
    
    // Parse the request body
    const body = await request.json()
    const { action, docStableId, title, description, content, committees, allowedAccessLevels, reason } = body

    switch (action) {
      case 'create':
        // Create a new document draft
        const document = await documentWorkflowService.createDraft(
          user,
          title,
          description,
          content || new ArrayBuffer(0),
          committees || [],
          allowedAccessLevels || ['Public']
        )
        return NextResponse.json(document)
        
      case 'submitForApproval':
        // Submit document for approval
        const submittedDoc = await documentWorkflowService.submitForApproval(user, docStableId, reason)
        return NextResponse.json(submittedDoc)
        
      case 'approve':
        // Approve document
        const approvedDoc = await documentWorkflowService.approve(user, docStableId, reason)
        return NextResponse.json(approvedDoc)
        
      case 'publish':
        // Publish document
        const publishedDoc = await documentWorkflowService.publish(user, docStableId, reason)
        return NextResponse.json(publishedDoc)
        
      case 'redact':
        // Redact document
        const redactedDoc = await documentWorkflowService.redact(user, docStableId, reason)
        return NextResponse.json(redactedDoc)
        
      case 'rescind':
        // Rescind document
        const rescindedDoc = await documentWorkflowService.rescind(user, docStableId, reason)
        return NextResponse.json(rescindedDoc)
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Documents API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const user = await verifyToken(token)
    
    // Get document ID from query parameters
    const { searchParams } = new URL(request.url)
    const docStableId = searchParams.get('docStableId')
    
    if (!docStableId) {
      return NextResponse.json({ error: 'docStableId parameter is required' }, { status: 400 })
    }

    // Get document by docStableId
    const document = await documentWorkflowService.getDocumentByDocStableId(docStableId)
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Log the access for audit trail
    await documentWorkflowService.logFileAccess(user, docStableId, 'view')

    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Documents API GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
