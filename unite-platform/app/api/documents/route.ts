// Documents API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import {
  validateTitle,
  validateDescription,
  validateDocStableId,
  validateAction,
  validateStringArray,
  validateReason,
  ValidationError
} from '@/lib/validation/input'

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

    // Validate action parameter
    const validActions = ['create', 'submitForApproval', 'approve', 'publish', 'redact', 'rescind']
    const validatedAction = validateAction(action, validActions)

    switch (validatedAction) {
      case 'create':
        // Validate inputs for document creation
        const validatedTitle = validateTitle(title)
        const validatedDescription = validateDescription(description)
        const validatedCommittees = validateStringArray(committees || [], 'committees', 50)
        const validatedAccessLevels = validateStringArray(allowedAccessLevels || ['Public'], 'allowedAccessLevels', 10)

        // Create a new document draft
        const document = await documentWorkflowService.createDraft(
          user,
          validatedTitle,
          validatedDescription,
          content || new ArrayBuffer(0),
          validatedCommittees,
          validatedAccessLevels
        )
        return NextResponse.json(document)

      case 'submitForApproval':
        // Validate docStableId and reason
        const submitDocId = validateDocStableId(docStableId)
        const submitReason = validateReason(reason)

        // Submit document for approval
        const submittedDoc = await documentWorkflowService.submitForApproval(user, submitDocId, submitReason)
        return NextResponse.json(submittedDoc)

      case 'approve':
        // Validate docStableId and reason
        const approveDocId = validateDocStableId(docStableId)
        const approveReason = validateReason(reason)

        // Approve document
        const approvedDoc = await documentWorkflowService.approve(user, approveDocId, approveReason)
        return NextResponse.json(approvedDoc)

      case 'publish':
        // Validate docStableId and reason
        const publishDocId = validateDocStableId(docStableId)
        const publishReason = validateReason(reason)

        // Publish document
        const publishedDoc = await documentWorkflowService.publish(user, publishDocId, publishReason)
        return NextResponse.json(publishedDoc)

      case 'redact':
        // Validate docStableId and reason
        const redactDocId = validateDocStableId(docStableId)
        const redactReason = validateReason(reason)

        // Redact document
        const redactedDoc = await documentWorkflowService.redact(user, redactDocId, redactReason)
        return NextResponse.json(redactedDoc)

      case 'rescind':
        // Validate docStableId and reason
        const rescindDocId = validateDocStableId(docStableId)
        const rescindReason = validateReason(reason)

        // Rescind document
        const rescindedDoc = await documentWorkflowService.rescind(user, rescindDocId, rescindReason)
        return NextResponse.json(rescindedDoc)
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Documents API error:', error)

    // Return user-friendly error for validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Don't leak implementation details for other errors
    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
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

    // Validate docStableId format
    const validatedDocId = validateDocStableId(docStableId)

    // Get document by docStableId
    const document = await documentWorkflowService.getDocumentByDocStableId(validatedDocId)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Log the access for audit trail (includes permission check)
    await documentWorkflowService.logFileAccess(user, validatedDocId, 'view')

    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Documents API GET error:', error)

    // Return user-friendly error for validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Don't leak implementation details for other errors
    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
  }
}
