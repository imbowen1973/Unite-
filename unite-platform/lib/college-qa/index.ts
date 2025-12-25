// College Quality Assurance & Accreditation Service for Unite Platform
// Manages college 5-year reports, committee reviews, remediation plans, and best practices
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { MeetingManagementService } from '@/lib/meeting'
import { randomUUID } from 'crypto'

export interface College {
  id: string
  code: string // e.g., "ENG", "MED", "BUS"
  name: string // e.g., "College of Engineering"
  guestAdminUserId: string
  assignedCommittee: string // Committee responsible for review
  dmsLibraryPath: string // Dedicated folder path
  status: 'active' | 'inactive' | 'under-review'
  lastReportDate?: string
  nextReportDueDate?: string
  currentRecertificationStatus?: 'certified' | 'provisional' | 'not-certified'
  certificationExpiryDate?: string
  createdAt: string
  updatedAt: string
}

export interface CollegeReport {
  id: string
  reportStableId: string // Permanent ID (e.g., REP-ENG-2025)
  collegeId: string
  collegeCode: string
  reportingPeriod: string // e.g., "2020-2025"
  submittedDate: string
  submittedBy: string
  status: 'draft' | 'submitted' | 'under-review' | 'evidence-requested' | 'completed' | 'board-review' | 'approved' | 'rejected'
  docStableId: string // Main report document
  evidenceDocuments: string[] // Array of docStableIds
  dmsWorkspacePath: string // Dedicated folder for this report
  assignedReviewer?: string
  reviewStartDate?: string
  reviewCompletedDate?: string
  committeeMeetingId?: string // Link to committee meeting
  boardMeetingId?: string // Link to board meeting
  recertificationRecommendation?: 'approve' | 'approve-with-conditions' | 'provisional' | 'reject'
  createdAt: string
  updatedAt: string
}

export interface EvidenceRequest {
  id: string
  reportId: string
  requestedBy: string // Committee member
  requestedDate: string
  question: string
  category: string // e.g., "Assessment", "Student Outcomes", "Resources"
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'responded' | 'clarification-needed' | 'satisfied'
  response?: string
  responseBy?: string
  responseDate?: string
  evidenceDocuments: string[] // docStableIds of evidence provided
}

export interface RemediationAction {
  id: string
  reportId: string
  collegeId: string
  category: string
  issue: string
  recommendation: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo: string[] // User OIDs
  dueDate: string
  status: 'open' | 'in-progress' | 'completed' | 'overdue' | 'cancelled'
  completionCriteria: string
  evidenceOfCompletion?: string[]
  createdBy: string
  createdDate: string
  completedDate?: string
  plannerTaskId?: string // Microsoft Planner integration
}

export interface BestPractice {
  id: string
  practiceStableId: string // e.g., BP-ASSESSMENT-2025-001
  title: string
  category: string // e.g., "Assessment", "Teaching", "Student Support"
  description: string
  sourceCollegeId: string
  sourceCollegeName: string
  sourceReportId: string
  extractedBy: string // Committee member who identified it
  extractedDate: string
  approvedBy?: string
  approvedDate?: string
  status: 'proposed' | 'approved' | 'published' | 'archived'
  visibility: 'all-colleges' | 'committee-only' | 'board-only'
  tags: string[]
  evidenceDocuments: string[] // Supporting documents
  adoptedByColleges: string[] // Array of college IDs that adopted this practice
  metrics?: {
    views: number
    adoptions: number
    rating?: number
  }
  createdAt: string
  updatedAt: string
}

export interface CommitteeRecommendation {
  id: string
  reportId: string
  collegeId: string
  recommendation: 'approve' | 'approve-with-conditions' | 'provisional' | 'reject'
  conditions?: string[] // If approved with conditions
  commendations: string[] // Things done well
  concerns: string[] // Areas of concern
  remediationActions: string[] // IDs of remediation actions
  bestPractices: string[] // IDs of best practices identified
  reviewSummary: string
  reviewedBy: string
  reviewDate: string
  committeeMeetingId?: string
  boardPackIncluded: boolean
  boardVoteId?: string
}

export class CollegeQAService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService
  private documentWorkflowService: DocumentWorkflowService
  private dmsService: DMSService
  private meetingService: MeetingManagementService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService,
    documentWorkflowService: DocumentWorkflowService,
    dmsService: DMSService,
    meetingService: MeetingManagementService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
    this.documentWorkflowService = documentWorkflowService
    this.dmsService = dmsService
    this.meetingService = meetingService
  }

  // ==================== COLLEGE MANAGEMENT ====================

  async createCollege(
    user: TokenPayload,
    code: string,
    name: string,
    guestAdminUserId: string,
    assignedCommittee: string
  ): Promise<College> {
    // Check permissions - only admins can create colleges
    const permissions = await this.accessControlService.getUserPermissions(user)
    if (permissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only administrators can create colleges')
    }

    const collegeId = randomUUID()

    // Create dedicated DMS library for this college
    const dmsLibraryPath = `unite-qa/colleges/${code}`
    await this.dmsService.createSiteLibrary({
      siteCollection: 'unite-qa',
      libraryName: `College-${code}`,
      purpose: `Quality assurance workspace for ${name}`,
      allowedAccessLevels: ['Admin', 'Executive'],
      retentionPeriod: 3650 // 10 years
    })

    // Calculate next report due date (5 years from now)
    const nextReportDueDate = new Date()
    nextReportDueDate.setFullYear(nextReportDueDate.getFullYear() + 5)

    const college: College = {
      id: collegeId,
      code,
      name,
      guestAdminUserId,
      assignedCommittee,
      dmsLibraryPath,
      status: 'active',
      nextReportDueDate: nextReportDueDate.toISOString(),
      currentRecertificationStatus: 'certified',
      certificationExpiryDate: nextReportDueDate.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.sharepointService.addListItem('collegesListId', {
      Id: collegeId,
      Code: code,
      Name: name,
      GuestAdminUserId: guestAdminUserId,
      AssignedCommittee: assignedCommittee,
      DMSLibraryPath: dmsLibraryPath,
      Status: 'active',
      NextReportDueDate: nextReportDueDate.toISOString(),
      CurrentRecertificationStatus: 'certified',
      CertificationExpiryDate: nextReportDueDate.toISOString(),
      CreatedAt: college.createdAt,
      UpdatedAt: college.updatedAt
    })

    await this.auditService.createAuditEvent(
      'college.created',
      user.upn,
      { collegeId, code, name, assignedCommittee },
      `create_college_${collegeId}`,
      'unite-qa'
    )

    return college
  }

  // ==================== REPORT SUBMISSION ====================

  async submitCollegeReport(
    user: TokenPayload,
    collegeId: string,
    reportingPeriod: string,
    reportDocument: ArrayBuffer,
    evidenceDocuments: ArrayBuffer[]
  ): Promise<CollegeReport> {
    const college = await this.getCollege(collegeId)
    if (!college) {
      throw new Error('College not found')
    }

    // Check permissions - must be college guest admin or system admin
    if (user.oid !== college.guestAdminUserId) {
      const permissions = await this.accessControlService.getUserPermissions(user)
      if (permissions.accessLevel !== AccessLevel.Admin) {
        throw new Error('Only college admin can submit reports')
      }
    }

    const reportId = randomUUID()
    const reportStableId = `REP-${college.code}-${new Date().getFullYear()}`

    // Create dedicated workspace for this report
    const workspacePath = `${college.dmsLibraryPath}/reports/${reportStableId}`

    // Upload main report document
    const mainDoc = await this.documentWorkflowService.createDraft(
      user,
      `${college.name} - 5 Year Report ${reportingPeriod}`,
      `Quality assurance report for ${reportingPeriod}`,
      reportDocument,
      [college.assignedCommittee],
      [AccessLevel.Admin, AccessLevel.Executive]
    )

    // Upload evidence documents
    const evidenceDocIds: string[] = []
    for (let i = 0; i < evidenceDocuments.length; i++) {
      const evidence = await this.documentWorkflowService.createDraft(
        user,
        `${reportStableId} - Evidence ${i + 1}`,
        `Supporting evidence for ${college.name} report`,
        evidenceDocuments[i],
        [college.assignedCommittee],
        [AccessLevel.Admin, AccessLevel.Executive]
      )
      evidenceDocIds.push(evidence.docStableId)
    }

    const report: CollegeReport = {
      id: reportId,
      reportStableId,
      collegeId,
      collegeCode: college.code,
      reportingPeriod,
      submittedDate: new Date().toISOString(),
      submittedBy: user.oid,
      status: 'submitted',
      docStableId: mainDoc.docStableId,
      evidenceDocuments: evidenceDocIds,
      dmsWorkspacePath: workspacePath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.sharepointService.addListItem('collegeReportsListId', {
      Id: reportId,
      ReportStableId: reportStableId,
      CollegeId: collegeId,
      CollegeCode: college.code,
      ReportingPeriod: reportingPeriod,
      SubmittedDate: report.submittedDate,
      SubmittedBy: user.oid,
      Status: 'submitted',
      DocStableId: mainDoc.docStableId,
      EvidenceDocuments: evidenceDocIds.join(','),
      DMSWorkspacePath: workspacePath,
      CreatedAt: report.createdAt,
      UpdatedAt: report.updatedAt
    })

    // Update college last report date
    college.lastReportDate = report.submittedDate
    await this.updateCollege(college)

    await this.auditService.createAuditEvent(
      'college.report.submitted',
      user.upn,
      {
        reportId,
        reportStableId,
        collegeId,
        collegeCode: college.code,
        evidenceCount: evidenceDocIds.length
      },
      `submit_report_${reportId}`,
      'unite-qa'
    )

    return report
  }

  // ==================== COMMITTEE REVIEW ====================

  async assignReviewer(
    user: TokenPayload,
    reportId: string,
    reviewerUserId: string
  ): Promise<CollegeReport> {
    const report = await this.getReport(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    // Check permissions - must be committee member or admin
    const permissions = await this.accessControlService.getUserPermissions(user)
    const college = await this.getCollege(report.collegeId)

    if (!permissions.committees.includes(college!.assignedCommittee) && permissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only committee members can assign reviewers')
    }

    report.assignedReviewer = reviewerUserId
    report.reviewStartDate = new Date().toISOString()
    report.status = 'under-review'
    report.updatedAt = new Date().toISOString()

    await this.updateReport(report)

    await this.auditService.createAuditEvent(
      'college.report.reviewer.assigned',
      user.upn,
      { reportId, reviewerUserId },
      `assign_reviewer_${reportId}`,
      'unite-qa'
    )

    return report
  }

  async requestEvidence(
    user: TokenPayload,
    reportId: string,
    question: string,
    category: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<EvidenceRequest> {
    const report = await this.getReport(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    const requestId = randomUUID()
    const request: EvidenceRequest = {
      id: requestId,
      reportId,
      requestedBy: user.oid,
      requestedDate: new Date().toISOString(),
      question,
      category,
      priority,
      status: 'pending',
      evidenceDocuments: []
    }

    await this.sharepointService.addListItem('evidenceRequestsListId', {
      Id: requestId,
      ReportId: reportId,
      RequestedBy: user.oid,
      RequestedDate: request.requestedDate,
      Question: question,
      Category: category,
      Priority: priority,
      Status: 'pending',
      EvidenceDocuments: ''
    })

    // Update report status to indicate evidence requested
    report.status = 'evidence-requested'
    report.updatedAt = new Date().toISOString()
    await this.updateReport(report)

    await this.auditService.createAuditEvent(
      'college.evidence.requested',
      user.upn,
      { reportId, requestId, category, priority },
      `request_evidence_${requestId}`,
      'unite-qa'
    )

    return request
  }

  async respondToEvidenceRequest(
    user: TokenPayload,
    requestId: string,
    response: string,
    evidenceDocuments: string[]
  ): Promise<EvidenceRequest> {
    const request = await this.getEvidenceRequest(requestId)
    if (!request) {
      throw new Error('Evidence request not found')
    }

    const report = await this.getReport(request.reportId)
    const college = await this.getCollege(report!.collegeId)

    // Check permissions - must be college admin
    if (user.oid !== college!.guestAdminUserId) {
      const permissions = await this.accessControlService.getUserPermissions(user)
      if (permissions.accessLevel !== AccessLevel.Admin) {
        throw new Error('Only college admin can respond to evidence requests')
      }
    }

    request.response = response
    request.responseBy = user.oid
    request.responseDate = new Date().toISOString()
    request.evidenceDocuments = evidenceDocuments
    request.status = 'responded'

    await this.sharepointService.updateListItem('evidenceRequestsListId', requestId, {
      Response: response,
      ResponseBy: user.oid,
      ResponseDate: request.responseDate,
      EvidenceDocuments: evidenceDocuments.join(','),
      Status: 'responded'
    })

    // Update report status back to under-review
    report!.status = 'under-review'
    report!.updatedAt = new Date().toISOString()
    await this.updateReport(report!)

    await this.auditService.createAuditEvent(
      'college.evidence.provided',
      user.upn,
      { requestId, reportId: request.reportId, evidenceCount: evidenceDocuments.length },
      `respond_evidence_${requestId}`,
      'unite-qa'
    )

    return request
  }

  // ==================== REMEDIATION ACTIONS ====================

  async createRemediationAction(
    user: TokenPayload,
    reportId: string,
    category: string,
    issue: string,
    recommendation: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    assignedTo: string[],
    dueDate: string,
    completionCriteria: string
  ): Promise<RemediationAction> {
    const report = await this.getReport(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    const actionId = randomUUID()
    const action: RemediationAction = {
      id: actionId,
      reportId,
      collegeId: report.collegeId,
      category,
      issue,
      recommendation,
      priority,
      assignedTo,
      dueDate,
      status: 'open',
      completionCriteria,
      createdBy: user.oid,
      createdDate: new Date().toISOString()
    }

    await this.sharepointService.addListItem('remediationActionsListId', {
      Id: actionId,
      ReportId: reportId,
      CollegeId: report.collegeId,
      Category: category,
      Issue: issue,
      Recommendation: recommendation,
      Priority: priority,
      AssignedTo: assignedTo.join(','),
      DueDate: dueDate,
      Status: 'open',
      CompletionCriteria: completionCriteria,
      CreatedBy: user.oid,
      CreatedDate: action.createdDate
    })

    await this.auditService.createAuditEvent(
      'remediation.action.created',
      user.upn,
      { actionId, reportId, category, priority, assignedTo },
      `create_remediation_${actionId}`,
      'unite-qa'
    )

    return action
  }

  // ==================== BEST PRACTICE EXTRACTION ====================

  async extractBestPractice(
    user: TokenPayload,
    reportId: string,
    title: string,
    category: string,
    description: string,
    evidenceDocuments: string[],
    tags: string[]
  ): Promise<BestPractice> {
    const report = await this.getReport(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    const college = await this.getCollege(report.collegeId)
    const practiceId = randomUUID()
    const practiceStableId = `BP-${category.toUpperCase().replace(/\s+/g, '-')}-${new Date().getFullYear()}-${practiceId.substring(0, 8).toUpperCase()}`

    const bestPractice: BestPractice = {
      id: practiceId,
      practiceStableId,
      title,
      category,
      description,
      sourceCollegeId: report.collegeId,
      sourceCollegeName: college!.name,
      sourceReportId: reportId,
      extractedBy: user.oid,
      extractedDate: new Date().toISOString(),
      status: 'proposed',
      visibility: 'committee-only',
      tags,
      evidenceDocuments,
      adoptedByColleges: [],
      metrics: {
        views: 0,
        adoptions: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.sharepointService.addListItem('bestPracticesListId', {
      Id: practiceId,
      PracticeStableId: practiceStableId,
      Title: title,
      Category: category,
      Description: description,
      SourceCollegeId: report.collegeId,
      SourceCollegeName: college!.name,
      SourceReportId: reportId,
      ExtractedBy: user.oid,
      ExtractedDate: bestPractice.extractedDate,
      Status: 'proposed',
      Visibility: 'committee-only',
      Tags: tags.join(','),
      EvidenceDocuments: evidenceDocuments.join(','),
      AdoptedByColleges: '',
      Metrics: JSON.stringify(bestPractice.metrics),
      CreatedAt: bestPractice.createdAt,
      UpdatedAt: bestPractice.updatedAt
    })

    await this.auditService.createAuditEvent(
      'best.practice.extracted',
      user.upn,
      { practiceId, practiceStableId, category, sourceCollegeId: report.collegeId },
      `extract_best_practice_${practiceId}`,
      'unite-qa'
    )

    return bestPractice
  }

  async publishBestPractice(
    user: TokenPayload,
    practiceId: string
  ): Promise<BestPractice> {
    const practice = await this.getBestPractice(practiceId)
    if (!practice) {
      throw new Error('Best practice not found')
    }

    // Check permissions - must be committee member or admin
    const permissions = await this.accessControlService.getUserPermissions(user)
    if (permissions.accessLevel !== AccessLevel.Admin && permissions.accessLevel !== AccessLevel.Executive) {
      throw new Error('Only committee members can publish best practices')
    }

    practice.status = 'published'
    practice.visibility = 'all-colleges'
    practice.approvedBy = user.oid
    practice.approvedDate = new Date().toISOString()
    practice.updatedAt = new Date().toISOString()

    await this.sharepointService.updateListItem('bestPracticesListId', practiceId, {
      Status: 'published',
      Visibility: 'all-colleges',
      ApprovedBy: user.oid,
      ApprovedDate: practice.approvedDate,
      UpdatedAt: practice.updatedAt
    })

    await this.auditService.createAuditEvent(
      'best.practice.published',
      user.upn,
      { practiceId, practiceStableId: practice.practiceStableId },
      `publish_best_practice_${practiceId}`,
      'unite-qa'
    )

    return practice
  }

  // ==================== COMMITTEE RECOMMENDATION ====================

  async createCommitteeRecommendation(
    user: TokenPayload,
    reportId: string,
    recommendation: 'approve' | 'approve-with-conditions' | 'provisional' | 'reject',
    conditions: string[],
    commendations: string[],
    concerns: string[],
    remediationActionIds: string[],
    bestPracticeIds: string[],
    reviewSummary: string
  ): Promise<CommitteeRecommendation> {
    const report = await this.getReport(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    const recommendationId = randomUUID()
    const committeeRec: CommitteeRecommendation = {
      id: recommendationId,
      reportId,
      collegeId: report.collegeId,
      recommendation,
      conditions,
      commendations,
      concerns,
      remediationActions: remediationActionIds,
      bestPractices: bestPracticeIds,
      reviewSummary,
      reviewedBy: user.oid,
      reviewDate: new Date().toISOString(),
      boardPackIncluded: false
    }

    await this.sharepointService.addListItem('committeeRecommendationsListId', {
      Id: recommendationId,
      ReportId: reportId,
      CollegeId: report.collegeId,
      Recommendation: recommendation,
      Conditions: conditions.join('||'),
      Commendations: commendations.join('||'),
      Concerns: concerns.join('||'),
      RemediationActions: remediationActionIds.join(','),
      BestPractices: bestPracticeIds.join(','),
      ReviewSummary: reviewSummary,
      ReviewedBy: user.oid,
      ReviewDate: committeeRec.reviewDate,
      BoardPackIncluded: false
    })

    // Update report status
    report.status = 'completed'
    report.reviewCompletedDate = committeeRec.reviewDate
    report.recertificationRecommendation = recommendation
    report.updatedAt = new Date().toISOString()
    await this.updateReport(report)

    await this.auditService.createAuditEvent(
      'committee.recommendation.created',
      user.upn,
      {
        recommendationId,
        reportId,
        collegeId: report.collegeId,
        recommendation,
        remediationCount: remediationActionIds.length,
        bestPracticeCount: bestPracticeIds.length
      },
      `create_recommendation_${recommendationId}`,
      'unite-qa'
    )

    return committeeRec
  }

  async addRecommendationToBoardPack(
    user: TokenPayload,
    recommendationId: string,
    boardMeetingId: string
  ): Promise<void> {
    const recommendation = await this.getRecommendation(recommendationId)
    if (!recommendation) {
      throw new Error('Recommendation not found')
    }

    const report = await this.getReport(recommendation.reportId)
    const college = await this.getCollege(recommendation.collegeId)

    // Create board pack document summarizing recommendation
    const boardPackSummary = this.generateBoardPackSummary(recommendation, report!, college!)

    // Add as agenda item to board meeting
    await this.meetingService.addAgendaItem(
      user,
      boardMeetingId,
      `Recertification: ${college!.name}`,
      boardPackSummary,
      100, // Order
      'voting',
      user.upn,
      30,
      [report!.docStableId],
      'approval',
      'simple-majority'
    )

    // Update recommendation
    recommendation.boardPackIncluded = true
    recommendation.committeeMeetingId = boardMeetingId

    await this.sharepointService.updateListItem('committeeRecommendationsListId', recommendationId, {
      BoardPackIncluded: true,
      BoardMeetingId: boardMeetingId
    })

    // Update report
    report!.boardMeetingId = boardMeetingId
    report!.status = 'board-review'
    await this.updateReport(report!)

    await this.auditService.createAuditEvent(
      'recommendation.added.board.pack',
      user.upn,
      { recommendationId, boardMeetingId, collegeId: recommendation.collegeId },
      `board_pack_${recommendationId}`,
      'unite-qa'
    )
  }

  // ==================== BOARD APPROVAL ====================

  async recordBoardDecision(
    user: TokenPayload,
    recommendationId: string,
    voteId: string,
    approved: boolean,
    effectiveDate: string
  ): Promise<void> {
    const recommendation = await this.getRecommendation(recommendationId)
    if (!recommendation) {
      throw new Error('Recommendation not found')
    }

    const report = await this.getReport(recommendation.reportId)
    const college = await this.getCollege(recommendation.collegeId)

    recommendation.boardVoteId = voteId

    await this.sharepointService.updateListItem('committeeRecommendationsListId', recommendationId, {
      BoardVoteId: voteId
    })

    // Update report status
    report!.status = approved ? 'approved' : 'rejected'
    report!.updatedAt = new Date().toISOString()
    await this.updateReport(report!)

    // Update college certification status
    if (approved) {
      college!.currentRecertificationStatus =
        recommendation.recommendation === 'provisional' ? 'provisional' : 'certified'
      college!.certificationExpiryDate = effectiveDate

      const nextReportDue = new Date(effectiveDate)
      nextReportDue.setFullYear(nextReportDue.getFullYear() + 5)
      college!.nextReportDueDate = nextReportDue.toISOString()
    } else {
      college!.currentRecertificationStatus = 'not-certified'
    }

    college!.updatedAt = new Date().toISOString()
    await this.updateCollege(college!)

    await this.auditService.createAuditEvent(
      'board.decision.recorded',
      user.upn,
      {
        recommendationId,
        reportId: recommendation.reportId,
        collegeId: recommendation.collegeId,
        approved,
        voteId,
        effectiveDate
      },
      `board_decision_${recommendationId}`,
      'unite-qa'
    )
  }

  // ==================== HELPER METHODS ====================

  private async getCollege(collegeId: string): Promise<College | null> {
    const colleges = await this.sharepointService.getListItems('collegesListId')
    for (const item of colleges) {
      if (item.fields.Id === collegeId) {
        return this.mapToCollege(item)
      }
    }
    return null
  }

  private async updateCollege(college: College): Promise<void> {
    await this.sharepointService.updateListItem('collegesListId', college.id, {
      LastReportDate: college.lastReportDate,
      NextReportDueDate: college.nextReportDueDate,
      CurrentRecertificationStatus: college.currentRecertificationStatus,
      CertificationExpiryDate: college.certificationExpiryDate,
      Status: college.status,
      UpdatedAt: college.updatedAt
    })
  }

  private async getReport(reportId: string): Promise<CollegeReport | null> {
    const reports = await this.sharepointService.getListItems('collegeReportsListId')
    for (const item of reports) {
      if (item.fields.Id === reportId) {
        return this.mapToReport(item)
      }
    }
    return null
  }

  private async updateReport(report: CollegeReport): Promise<void> {
    await this.sharepointService.updateListItem('collegeReportsListId', report.id, {
      Status: report.status,
      AssignedReviewer: report.assignedReviewer,
      ReviewStartDate: report.reviewStartDate,
      ReviewCompletedDate: report.reviewCompletedDate,
      CommitteeMeetingId: report.committeeMeetingId,
      BoardMeetingId: report.boardMeetingId,
      RecertificationRecommendation: report.recertificationRecommendation,
      UpdatedAt: report.updatedAt
    })
  }

  private async getEvidenceRequest(requestId: string): Promise<EvidenceRequest | null> {
    const requests = await this.sharepointService.getListItems('evidenceRequestsListId')
    for (const item of requests) {
      if (item.fields.Id === requestId) {
        return this.mapToEvidenceRequest(item)
      }
    }
    return null
  }

  private async getBestPractice(practiceId: string): Promise<BestPractice | null> {
    const practices = await this.sharepointService.getListItems('bestPracticesListId')
    for (const item of practices) {
      if (item.fields.Id === practiceId) {
        return this.mapToBestPractice(item)
      }
    }
    return null
  }

  private async getRecommendation(recommendationId: string): Promise<CommitteeRecommendation | null> {
    const recommendations = await this.sharepointService.getListItems('committeeRecommendationsListId')
    for (const item of recommendations) {
      if (item.fields.Id === recommendationId) {
        return this.mapToRecommendation(item)
      }
    }
    return null
  }

  private generateBoardPackSummary(
    recommendation: CommitteeRecommendation,
    report: CollegeReport,
    college: College
  ): string {
    return `
## Recertification Recommendation: ${college.name}

**Reporting Period:** ${report.reportingPeriod}
**Committee Recommendation:** ${recommendation.recommendation.toUpperCase()}

### Commendations
${recommendation.commendations.map(c => `- ${c}`).join('\n')}

### Concerns
${recommendation.concerns.map(c => `- ${c}`).join('\n')}

### Conditions (if applicable)
${recommendation.conditions ? recommendation.conditions.map(c => `- ${c}`).join('\n') : 'None'}

### Remediation Actions Required
**Count:** ${recommendation.remediationActions.length}

### Best Practices Identified
**Count:** ${recommendation.bestPractices.length}

### Summary
${recommendation.reviewSummary}
    `.trim()
  }

  private mapToCollege(item: any): College {
    return {
      id: item.fields.Id,
      code: item.fields.Code,
      name: item.fields.Name,
      guestAdminUserId: item.fields.GuestAdminUserId,
      assignedCommittee: item.fields.AssignedCommittee,
      dmsLibraryPath: item.fields.DMSLibraryPath,
      status: item.fields.Status,
      lastReportDate: item.fields.LastReportDate,
      nextReportDueDate: item.fields.NextReportDueDate,
      currentRecertificationStatus: item.fields.CurrentRecertificationStatus,
      certificationExpiryDate: item.fields.CertificationExpiryDate,
      createdAt: item.fields.CreatedAt,
      updatedAt: item.fields.UpdatedAt
    }
  }

  private mapToReport(item: any): CollegeReport {
    return {
      id: item.fields.Id,
      reportStableId: item.fields.ReportStableId,
      collegeId: item.fields.CollegeId,
      collegeCode: item.fields.CollegeCode,
      reportingPeriod: item.fields.ReportingPeriod,
      submittedDate: item.fields.SubmittedDate,
      submittedBy: item.fields.SubmittedBy,
      status: item.fields.Status,
      docStableId: item.fields.DocStableId,
      evidenceDocuments: item.fields.EvidenceDocuments ? item.fields.EvidenceDocuments.split(',') : [],
      dmsWorkspacePath: item.fields.DMSWorkspacePath,
      assignedReviewer: item.fields.AssignedReviewer,
      reviewStartDate: item.fields.ReviewStartDate,
      reviewCompletedDate: item.fields.ReviewCompletedDate,
      committeeMeetingId: item.fields.CommitteeMeetingId,
      boardMeetingId: item.fields.BoardMeetingId,
      recertificationRecommendation: item.fields.RecertificationRecommendation,
      createdAt: item.fields.CreatedAt,
      updatedAt: item.fields.UpdatedAt
    }
  }

  private mapToEvidenceRequest(item: any): EvidenceRequest {
    return {
      id: item.fields.Id,
      reportId: item.fields.ReportId,
      requestedBy: item.fields.RequestedBy,
      requestedDate: item.fields.RequestedDate,
      question: item.fields.Question,
      category: item.fields.Category,
      priority: item.fields.Priority,
      status: item.fields.Status,
      response: item.fields.Response,
      responseBy: item.fields.ResponseBy,
      responseDate: item.fields.ResponseDate,
      evidenceDocuments: item.fields.EvidenceDocuments ? item.fields.EvidenceDocuments.split(',') : []
    }
  }

  private mapToBestPractice(item: any): BestPractice {
    return {
      id: item.fields.Id,
      practiceStableId: item.fields.PracticeStableId,
      title: item.fields.Title,
      category: item.fields.Category,
      description: item.fields.Description,
      sourceCollegeId: item.fields.SourceCollegeId,
      sourceCollegeName: item.fields.SourceCollegeName,
      sourceReportId: item.fields.SourceReportId,
      extractedBy: item.fields.ExtractedBy,
      extractedDate: item.fields.ExtractedDate,
      approvedBy: item.fields.ApprovedBy,
      approvedDate: item.fields.ApprovedDate,
      status: item.fields.Status,
      visibility: item.fields.Visibility,
      tags: item.fields.Tags ? item.fields.Tags.split(',') : [],
      evidenceDocuments: item.fields.EvidenceDocuments ? item.fields.EvidenceDocuments.split(',') : [],
      adoptedByColleges: item.fields.AdoptedByColleges ? item.fields.AdoptedByColleges.split(',') : [],
      metrics: item.fields.Metrics ? JSON.parse(item.fields.Metrics) : { views: 0, adoptions: 0 },
      createdAt: item.fields.CreatedAt,
      updatedAt: item.fields.UpdatedAt
    }
  }

  private mapToRecommendation(item: any): CommitteeRecommendation {
    return {
      id: item.fields.Id,
      reportId: item.fields.ReportId,
      collegeId: item.fields.CollegeId,
      recommendation: item.fields.Recommendation,
      conditions: item.fields.Conditions ? item.fields.Conditions.split('||') : [],
      commendations: item.fields.Commendations ? item.fields.Commendations.split('||') : [],
      concerns: item.fields.Concerns ? item.fields.Concerns.split('||') : [],
      remediationActions: item.fields.RemediationActions ? item.fields.RemediationActions.split(',') : [],
      bestPractices: item.fields.BestPractices ? item.fields.BestPractices.split(',') : [],
      reviewSummary: item.fields.ReviewSummary,
      reviewedBy: item.fields.ReviewedBy,
      reviewDate: item.fields.ReviewDate,
      committeeMeetingId: item.fields.CommitteeMeetingId,
      boardPackIncluded: item.fields.BoardPackIncluded,
      boardVoteId: item.fields.BoardVoteId
    }
  }
}
