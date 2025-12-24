// Policy Management API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { PolicyManagementService } from '@/lib/policy'
import {
  validateTitle,
  validateDescription,
  validateAction,
  validateStringArray,
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
const dmsService = new DMSService(sharepointService, auditService)
const documentWorkflowService = new DocumentWorkflowService(
  sharepointService,
  auditService,
  accessControlService,
  dmsService
)
const policyService = new PolicyManagementService(
  sharepointService,
  auditService,
  accessControlService,
  documentWorkflowService,
  dmsService
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
    const { action } = body

    // Validate action
    const validActions = [
      'create',
      'proposeChange',
      'submitForExecutiveReview',
      'approveByExecutive',
      'approveByBoard',
      'publish',
      'getPolicyDiff'
    ]
    const validatedAction = validateAction(action, validActions)

    switch (validatedAction) {
      case 'create':
        // Create new policy
        const { title, description, category, content, complianceFrameworks, owner, reviewCycle } = body

        const validatedTitle = validateTitle(title)
        const validatedDescription = validateDescription(description)
        const validatedFrameworks = validateStringArray(complianceFrameworks || [], 'complianceFrameworks', 20)

        const policy = await policyService.createPolicy(
          user,
          validatedTitle,
          validatedDescription,
          category,
          content || new ArrayBuffer(0),
          validatedFrameworks,
          owner || user.oid,
          reviewCycle || 5
        )
        return NextResponse.json(policy)

      case 'proposeChange':
        // Propose a change to existing policy
        const { policyStableId, changesSummary, changesDetail, impactAssessment, affectedSections } = body

        const proposal = await policyService.proposeChange(
          user,
          policyStableId,
          changesSummary,
          changesDetail,
          impactAssessment,
          affectedSections || []
        )
        return NextResponse.json(proposal)

      case 'submitForExecutiveReview':
        // Submit policy for executive review (first stage)
        const { policyId: submitPolicyId, reason: submitReason } = body

        const submittedPolicy = await policyService.submitForExecutiveReview(
          user,
          submitPolicyId,
          submitReason
        )
        return NextResponse.json(submittedPolicy)

      case 'approveByExecutive':
        // Executive approval (moves to board review)
        const { policyId: execPolicyId, reason: execReason } = body

        const execApprovedPolicy = await policyService.approveByExecutive(
          user,
          execPolicyId,
          execReason
        )
        return NextResponse.json(execApprovedPolicy)

      case 'approveByBoard':
        // Board approval (final approval)
        const { policyId: boardPolicyId, effectiveDate, reason: boardReason } = body

        if (!effectiveDate) {
          return NextResponse.json({ error: 'effectiveDate is required for board approval' }, { status: 400 })
        }

        const boardApprovedPolicy = await policyService.approveByBoard(
          user,
          boardPolicyId,
          effectiveDate,
          boardReason
        )
        return NextResponse.json(boardApprovedPolicy)

      case 'publish':
        // Publish policy (supersedes old version)
        const { policyId: publishPolicyId } = body

        const publishedPolicy = await policyService.publishPolicy(
          user,
          publishPolicyId
        )
        return NextResponse.json(publishedPolicy)

      case 'getPolicyDiff':
        // Get diff between two versions
        const { policyStableId: diffPolicyId, fromVersion, toVersion } = body

        if (!diffPolicyId || !fromVersion || !toVersion) {
          return NextResponse.json({
            error: 'policyStableId, fromVersion, and toVersion are required'
          }, { status: 400 })
        }

        const diff = await policyService.getPolicyDiff(
          diffPolicyId,
          fromVersion,
          toVersion
        )
        return NextResponse.json(diff)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Policy API error:', error)

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
    // Extract token from header (optional for public policies)
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    let user = null

    if (token) {
      try {
        user = await verifyToken(token)
      } catch (e) {
        // Invalid token, treat as public user
        user = null
      }
    }

    // Get parameters from query
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const policyStableId = searchParams.get('policyStableId')

    if (!action) {
      return NextResponse.json({ error: 'action parameter is required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'getVersionHistory':
        // Get version history for a policy
        if (!policyStableId) {
          return NextResponse.json({ error: 'policyStableId is required' }, { status: 400 })
        }

        result = await policyService.getVersionHistory(policyStableId)
        break

      case 'getPoliciesRequiringReview':
        // Get policies approaching review date (admin/exec only)
        if (!user) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const warningMonths = parseInt(searchParams.get('warningMonths') || '6', 10)
        result = await policyService.getPoliciesRequiringReview(warningMonths)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Audit log (only if authenticated)
    if (user) {
      await auditService.createAuditEvent(
        'policy.accessed',
        user.upn,
        {
          action,
          policyStableId,
          userId: user.oid
        },
        `access_policy_${action}_${policyStableId || 'list'}_${Date.now()}`,
        'unite-policies'
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Policy API GET error:', error)

    // Return user-friendly error for validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Don't leak implementation details for other errors
    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
  }
}
