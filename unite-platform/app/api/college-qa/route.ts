// College Quality Assurance API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { MeetingManagementService } from '@/lib/meeting'
import { CollegeQAService } from '@/lib/college-qa'
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
const meetingService = new MeetingManagementService(
  sharepointService,
  auditService,
  accessControlService,
  documentWorkflowService,
  dmsService
)
const collegeQAService = new CollegeQAService(
  sharepointService,
  auditService,
  accessControlService,
  documentWorkflowService,
  dmsService,
  meetingService
)

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    const body = await request.json()
    const { action } = body

    const validActions = [
      'createCollege',
      'submitReport',
      'assignReviewer',
      'requestEvidence',
      'respondToEvidence',
      'createRemediationAction',
      'extractBestPractice',
      'publishBestPractice',
      'createRecommendation',
      'addToBoardPack',
      'recordBoardDecision'
    ]
    const validatedAction = validateAction(action, validActions)

    switch (validatedAction) {
      case 'createCollege':
        const { code, name, guestAdminUserId, assignedCommittee } = body
        const college = await collegeQAService.createCollege(
          user,
          code,
          name,
          guestAdminUserId,
          assignedCommittee
        )
        return NextResponse.json(college)

      case 'submitReport':
        const { collegeId, reportingPeriod, reportDocument, evidenceDocuments } = body
        const report = await collegeQAService.submitCollegeReport(
          user,
          collegeId,
          reportingPeriod,
          reportDocument,
          evidenceDocuments || []
        )
        return NextResponse.json(report)

      case 'assignReviewer':
        const { reportId: assignReportId, reviewerUserId } = body
        const assignedReport = await collegeQAService.assignReviewer(
          user,
          assignReportId,
          reviewerUserId
        )
        return NextResponse.json(assignedReport)

      case 'requestEvidence':
        const { reportId: evidenceReportId, question, category, priority } = body
        const request = await collegeQAService.requestEvidence(
          user,
          evidenceReportId,
          question,
          category,
          priority || 'medium'
        )
        return NextResponse.json(request)

      case 'respondToEvidence':
        const { requestId, response, evidenceDocs } = body
        const respondedRequest = await collegeQAService.respondToEvidenceRequest(
          user,
          requestId,
          response,
          evidenceDocs || []
        )
        return NextResponse.json(respondedRequest)

      case 'createRemediationAction':
        const {
          reportId: remReportId,
          category: remCategory,
          issue,
          recommendation,
          priority: remPriority,
          assignedTo,
          dueDate,
          completionCriteria
        } = body
        const remediation = await collegeQAService.createRemediationAction(
          user,
          remReportId,
          remCategory,
          issue,
          recommendation,
          remPriority,
          assignedTo,
          dueDate,
          completionCriteria
        )
        return NextResponse.json(remediation)

      case 'extractBestPractice':
        const {
          reportId: bpReportId,
          title,
          category: bpCategory,
          description,
          evidenceDocuments: bpEvidence,
          tags
        } = body
        const bestPractice = await collegeQAService.extractBestPractice(
          user,
          bpReportId,
          title,
          bpCategory,
          description,
          bpEvidence || [],
          tags || []
        )
        return NextResponse.json(bestPractice)

      case 'publishBestPractice':
        const { practiceId } = body
        const publishedPractice = await collegeQAService.publishBestPractice(
          user,
          practiceId
        )
        return NextResponse.json(publishedPractice)

      case 'createRecommendation':
        const {
          reportId: recReportId,
          recommendation: recType,
          conditions,
          commendations,
          concerns,
          remediationActionIds,
          bestPracticeIds,
          reviewSummary
        } = body
        const committeeRec = await collegeQAService.createCommitteeRecommendation(
          user,
          recReportId,
          recType,
          conditions || [],
          commendations || [],
          concerns || [],
          remediationActionIds || [],
          bestPracticeIds || [],
          reviewSummary
        )
        return NextResponse.json(committeeRec)

      case 'addToBoardPack':
        const { recommendationId, boardMeetingId } = body
        await collegeQAService.addRecommendationToBoardPack(
          user,
          recommendationId,
          boardMeetingId
        )
        return NextResponse.json({ success: true })

      case 'recordBoardDecision':
        const {
          recommendationId: decRecId,
          voteId,
          approved,
          effectiveDate
        } = body
        await collegeQAService.recordBoardDecision(
          user,
          decRecId,
          voteId,
          approved,
          effectiveDate
        )
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('College QA API error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (!action) {
      return NextResponse.json({ error: 'action parameter required' }, { status: 400 })
    }

    // GET endpoints would retrieve data
    // Implementation depends on specific needs
    return NextResponse.json({ message: 'GET endpoints coming soon' })
  } catch (error: any) {
    console.error('College QA API GET error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
  }
}
