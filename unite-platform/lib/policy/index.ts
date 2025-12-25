// Policy Management Service for Unite Platform
// Handles versioning, approval workflows, and compliance tracking
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { randomUUID } from 'crypto'

export interface Policy {
  id: string
  policyStableId: string // Permanent ID across all versions (e.g., POL-INFO-SEC)
  versionNumber: string // e.g., "2.0", "2.1"
  title: string
  description: string
  category: string // e.g., "Information Security", "HR", "Finance"
  docStableId: string // Current document version's ID
  status: 'draft' | 'executive-review' | 'board-review' | 'approved' | 'published' | 'superseded' | 'archived'
  complianceFrameworks: string[] // e.g., ["ISO 27001", "GDPR", "SOC2"]
  owner: string // User OID responsible for policy
  reviewCycle: number // In years (default 5)
  nextReviewDate: string
  effectiveDate?: string // When policy becomes active
  approvalDate?: string // When board approved
  publishedDate?: string // When made public
  supersededBy?: string // PolicyStableId of newer version
  createdAt: string
  createdBy: string
  updatedAt: string
}

export interface PolicyVersion {
  id: string
  policyStableId: string
  versionNumber: string
  docStableId: string
  title: string
  status: string
  effectiveDate?: string
  approvalDate?: string
  publishedDate?: string
  createdAt: string
  createdBy: string
  changesSummary?: string
}

export interface PolicyChangeProposal {
  id: string
  policyStableId: string
  proposedVersion: string
  proposer: string
  proposalDate: string
  changesSummary: string
  changesDetail: string // Full description of changes
  impactAssessment: string
  affectedSections: string[]
  status: 'proposed' | 'executive-review' | 'board-review' | 'approved' | 'rejected'
  executiveApprover?: string
  executiveApprovalDate?: string
  boardApprover?: string
  boardApprovalDate?: string
  rejectionReason?: string
}

export interface PolicyDiff {
  policyStableId: string
  fromVersion: string
  toVersion: string
  changes: PolicyChange[]
  generatedAt: string
}

export interface PolicyChange {
  section: string
  changeType: 'added' | 'modified' | 'removed'
  oldContent?: string
  newContent?: string
  lineNumber?: number
}

export class PolicyManagementService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService
  private documentWorkflowService: DocumentWorkflowService
  private dmsService: DMSService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService,
    documentWorkflowService: DocumentWorkflowService,
    dmsService: DMSService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
    this.documentWorkflowService = documentWorkflowService
    this.dmsService = dmsService
  }

  // Create a new policy (initial version)
  async createPolicy(
    user: TokenPayload,
    title: string,
    description: string,
    category: string,
    content: ArrayBuffer,
    complianceFrameworks: string[],
    owner: string,
    reviewCycle: number = 5
  ): Promise<Policy> {
    // Check permissions - only admins and executives can create policies
    const permissions = await this.accessControlService.getUserPermissions(user)
    if (permissions.accessLevel !== AccessLevel.Admin && permissions.accessLevel !== AccessLevel.Executive) {
      throw new Error('Only administrators and executives can create policies')
    }

    // Generate stable IDs
    const policyStableId = this.generatePolicyStableId(category)
    const policyId = randomUUID()
    const versionNumber = '1.0'

    // Create the document using document workflow service
    const document = await this.documentWorkflowService.createDraft(
      user,
      `${title} v${versionNumber}`,
      description,
      content,
      ['board', 'executive'], // Policy accessible to board and executive
      [AccessLevel.Admin, AccessLevel.Executive]
    )

    // Calculate next review date (5 years from creation)
    const nextReviewDate = new Date()
    nextReviewDate.setFullYear(nextReviewDate.getFullYear() + reviewCycle)

    const policy: Policy = {
      id: policyId,
      policyStableId,
      versionNumber,
      title,
      description,
      category,
      docStableId: document.docStableId,
      status: 'draft',
      complianceFrameworks,
      owner,
      reviewCycle,
      nextReviewDate: nextReviewDate.toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: user.oid,
      updatedAt: new Date().toISOString()
    }

    // Store policy metadata in SharePoint
    await this.sharepointService.addListItem('policiesListId', {
      Id: policyId,
      PolicyStableId: policyStableId,
      VersionNumber: versionNumber,
      Title: title,
      Description: description,
      Category: category,
      DocStableId: document.docStableId,
      Status: 'draft',
      ComplianceFrameworks: complianceFrameworks.join(','),
      Owner: owner,
      ReviewCycle: reviewCycle,
      NextReviewDate: nextReviewDate.toISOString(),
      CreatedAt: policy.createdAt,
      CreatedBy: user.oid,
      UpdatedAt: policy.updatedAt
    })

    // Create version history entry
    await this.createVersionHistoryEntry(policy, user.oid, 'Initial policy creation')

    // Audit log
    await this.auditService.createAuditEvent(
      'policy.created',
      user.upn,
      {
        policyId,
        policyStableId,
        versionNumber,
        title,
        category,
        complianceFrameworks
      },
      `create_policy_${policyId}`,
      'unite-policies'
    )

    return policy
  }

  // Propose a change to an existing policy
  async proposeChange(
    user: TokenPayload,
    policyStableId: string,
    changesSummary: string,
    changesDetail: string,
    impactAssessment: string,
    affectedSections: string[]
  ): Promise<PolicyChangeProposal> {
    // Get current published policy
    const currentPolicy = await this.getCurrentPublishedPolicy(policyStableId)
    if (!currentPolicy) {
      throw new Error('Policy not found or not published')
    }

    // Calculate new version number
    const currentVersion = parseFloat(currentPolicy.versionNumber)
    const proposedVersion = (currentVersion + 0.1).toFixed(1)

    const proposalId = randomUUID()
    const proposal: PolicyChangeProposal = {
      id: proposalId,
      policyStableId,
      proposedVersion,
      proposer: user.oid,
      proposalDate: new Date().toISOString(),
      changesSummary,
      changesDetail,
      impactAssessment,
      affectedSections,
      status: 'proposed'
    }

    // Store proposal
    await this.sharepointService.addListItem('policyProposalsListId', {
      Id: proposalId,
      PolicyStableId: policyStableId,
      ProposedVersion: proposedVersion,
      Proposer: user.oid,
      ProposalDate: proposal.proposalDate,
      ChangesSummary: changesSummary,
      ChangesDetail: changesDetail,
      ImpactAssessment: impactAssessment,
      AffectedSections: affectedSections.join(','),
      Status: 'proposed'
    })

    // Audit log
    await this.auditService.createAuditEvent(
      'policy.change.proposed',
      user.upn,
      {
        proposalId,
        policyStableId,
        proposedVersion,
        changesSummary,
        impactAssessment
      },
      `propose_policy_change_${proposalId}`,
      'unite-policies'
    )

    return proposal
  }

  // Submit policy for executive review (first stage)
  async submitForExecutiveReview(
    user: TokenPayload,
    policyId: string,
    reason?: string
  ): Promise<Policy> {
    const policy = await this.getPolicyById(policyId)
    if (!policy) {
      throw new Error('Policy not found')
    }

    // Check permissions
    const permissions = await this.accessControlService.getUserPermissions(user)
    if (policy.createdBy !== user.oid && permissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only policy creator or admin can submit for review')
    }

    if (policy.status !== 'draft') {
      throw new Error('Only draft policies can be submitted for executive review')
    }

    // Update status
    policy.status = 'executive-review'
    policy.updatedAt = new Date().toISOString()

    await this.updatePolicyInSharePoint(policy)

    // Submit underlying document for approval
    await this.documentWorkflowService.submitForApproval(user, policy.docStableId, reason)

    // Audit log
    await this.auditService.createAuditEvent(
      'policy.submitted.executive',
      user.upn,
      {
        policyId,
        policyStableId: policy.policyStableId,
        versionNumber: policy.versionNumber,
        reason
      },
      `submit_executive_review_${policyId}`,
      'unite-policies'
    )

    return policy
  }

  // Executive approval (first stage) - moves to board review
  async approveByExecutive(
    user: TokenPayload,
    policyId: string,
    reason?: string
  ): Promise<Policy> {
    const policy = await this.getPolicyById(policyId)
    if (!policy) {
      throw new Error('Policy not found')
    }

    // Check permissions - must be executive or admin
    const permissions = await this.accessControlService.getUserPermissions(user)
    if (permissions.accessLevel !== AccessLevel.Executive && permissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only executives can approve policies at this stage')
    }

    if (policy.status !== 'executive-review') {
      throw new Error('Policy must be in executive review to approve')
    }

    // Update status to board review
    policy.status = 'board-review'
    policy.updatedAt = new Date().toISOString()

    await this.updatePolicyInSharePoint(policy)

    // Approve underlying document
    await this.documentWorkflowService.approve(user, policy.docStableId, reason)

    // Audit log
    await this.auditService.createAuditEvent(
      'policy.approved.executive',
      user.upn,
      {
        policyId,
        policyStableId: policy.policyStableId,
        versionNumber: policy.versionNumber,
        approver: user.oid,
        reason
      },
      `executive_approve_${policyId}`,
      'unite-policies'
    )

    return policy
  }

  // Board approval (second stage) - final approval
  async approveByBoard(
    user: TokenPayload,
    policyId: string,
    effectiveDate: string,
    reason?: string
  ): Promise<Policy> {
    const policy = await this.getPolicyById(policyId)
    if (!policy) {
      throw new Error('Policy not found')
    }

    // Check permissions - must be board member with approval rights
    const permissions = await this.accessControlService.getUserPermissions(user)
    if (!permissions.canApprove && permissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only board members with approval rights can approve policies')
    }

    if (policy.status !== 'board-review') {
      throw new Error('Policy must be in board review to approve')
    }

    // Update status
    policy.status = 'approved'
    policy.approvalDate = new Date().toISOString()
    policy.effectiveDate = effectiveDate
    policy.updatedAt = new Date().toISOString()

    await this.updatePolicyInSharePoint(policy)

    // Audit log
    await this.auditService.createAuditEvent(
      'policy.approved.board',
      user.upn,
      {
        policyId,
        policyStableId: policy.policyStableId,
        versionNumber: policy.versionNumber,
        approver: user.oid,
        effectiveDate,
        reason
      },
      `board_approve_${policyId}`,
      'unite-policies'
    )

    return policy
  }

  // Publish policy (supersedes old version if exists)
  async publishPolicy(
    user: TokenPayload,
    policyId: string
  ): Promise<Policy> {
    const policy = await this.getPolicyById(policyId)
    if (!policy) {
      throw new Error('Policy not found')
    }

    // Check permissions
    const permissions = await this.accessControlService.getUserPermissions(user)
    if (!permissions.canPublish && permissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only users with publish rights can publish policies')
    }

    if (policy.status !== 'approved') {
      throw new Error('Only approved policies can be published')
    }

    // Get current published version (if exists) and supersede it
    const currentPublished = await this.getCurrentPublishedPolicy(policy.policyStableId)
    if (currentPublished && currentPublished.id !== policyId) {
      // Supersede old version
      currentPublished.status = 'superseded'
      currentPublished.supersededBy = policy.policyStableId
      currentPublished.updatedAt = new Date().toISOString()
      await this.updatePolicyInSharePoint(currentPublished)

      // Audit superseding
      await this.auditService.createAuditEvent(
        'policy.superseded',
        user.upn,
        {
          supersededPolicyId: currentPublished.id,
          supersededVersion: currentPublished.versionNumber,
          newPolicyId: policyId,
          newVersion: policy.versionNumber
        },
        `supersede_policy_${currentPublished.id}`,
        'unite-policies'
      )
    }

    // Publish new version
    policy.status = 'published'
    policy.publishedDate = new Date().toISOString()
    policy.updatedAt = new Date().toISOString()

    await this.updatePolicyInSharePoint(policy)

    // Publish underlying document
    await this.documentWorkflowService.publish(user, policy.docStableId, 'Policy approved by board and published')

    // Audit log
    await this.auditService.createAuditEvent(
      'policy.published',
      user.upn,
      {
        policyId,
        policyStableId: policy.policyStableId,
        versionNumber: policy.versionNumber,
        effectiveDate: policy.effectiveDate,
        supersededPrevious: !!currentPublished
      },
      `publish_policy_${policyId}`,
      'unite-policies'
    )

    return policy
  }

  // Get version history for a policy
  async getVersionHistory(policyStableId: string): Promise<PolicyVersion[]> {
    const historyList = await this.sharepointService.getListItems('policyVersionHistoryListId')
    const versions: PolicyVersion[] = []

    for (const item of historyList) {
      if (item.fields.PolicyStableId === policyStableId) {
        versions.push({
          id: item.fields.Id,
          policyStableId: item.fields.PolicyStableId,
          versionNumber: item.fields.VersionNumber,
          docStableId: item.fields.DocStableId,
          title: item.fields.Title,
          status: item.fields.Status,
          effectiveDate: item.fields.EffectiveDate,
          approvalDate: item.fields.ApprovalDate,
          publishedDate: item.fields.PublishedDate,
          createdAt: item.fields.CreatedAt,
          createdBy: item.fields.CreatedBy,
          changesSummary: item.fields.ChangesSummary
        })
      }
    }

    // Sort by version number descending
    return versions.sort((a, b) => parseFloat(b.versionNumber) - parseFloat(a.versionNumber))
  }

  // Get policies requiring review (approaching 5 year review date)
  async getPoliciesRequiringReview(warningMonths: number = 6): Promise<Policy[]> {
    const policiesList = await this.sharepointService.getListItems('policiesListId')
    const policies: Policy[] = []
    const warningDate = new Date()
    warningDate.setMonth(warningDate.getMonth() + warningMonths)

    for (const item of policiesList) {
      if (item.fields.Status === 'published') {
        const nextReview = new Date(item.fields.NextReviewDate)
        if (nextReview <= warningDate) {
          policies.push(this.mapSharePointItemToPolicy(item))
        }
      }
    }

    return policies
  }

  // Get diff between two policy versions
  async getPolicyDiff(
    policyStableId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<PolicyDiff> {
    // Get both versions
    const versions = await this.getVersionHistory(policyStableId)
    const fromDoc = versions.find(v => v.versionNumber === fromVersion)
    const toDoc = versions.find(v => v.versionNumber === toVersion)

    if (!fromDoc || !toDoc) {
      throw new Error('One or both versions not found')
    }

    // Get document content (this is simplified - in reality you'd parse the documents)
    // For now, we'll return a placeholder diff structure
    const diff: PolicyDiff = {
      policyStableId,
      fromVersion,
      toVersion,
      changes: [
        {
          section: 'Section 1',
          changeType: 'modified',
          oldContent: 'Previous content...',
          newContent: 'Updated content...',
          lineNumber: 10
        }
      ],
      generatedAt: new Date().toISOString()
    }

    return diff
  }

  // Check user access to policy version (board sees all, public sees current only)
  async canAccessPolicyVersion(
    user: TokenPayload | null,
    policy: Policy
  ): Promise<boolean> {
    // Public users (not logged in) can only see published current version
    if (!user) {
      return policy.status === 'published' && !policy.supersededBy
    }

    // Get user permissions
    const permissions = await this.accessControlService.getUserPermissions(user)

    // Admins and board members can see all versions
    if (permissions.accessLevel === AccessLevel.Admin ||
        permissions.committees.includes('board') ||
        permissions.accessLevel === AccessLevel.Executive) {
      return true
    }

    // Other users can only see current published version
    return policy.status === 'published' && !policy.supersededBy
  }

  // Private helper methods

  private async getPolicyById(policyId: string): Promise<Policy | null> {
    const policiesList = await this.sharepointService.getListItems('policiesListId')

    for (const item of policiesList) {
      if (item.fields.Id === policyId) {
        return this.mapSharePointItemToPolicy(item)
      }
    }

    return null
  }

  private async getCurrentPublishedPolicy(policyStableId: string): Promise<Policy | null> {
    const policiesList = await this.sharepointService.getListItems('policiesListId')

    for (const item of policiesList) {
      if (item.fields.PolicyStableId === policyStableId &&
          item.fields.Status === 'published' &&
          !item.fields.SupersededBy) {
        return this.mapSharePointItemToPolicy(item)
      }
    }

    return null
  }

  private async updatePolicyInSharePoint(policy: Policy): Promise<void> {
    await this.sharepointService.updateListItem('policiesListId', policy.id, {
      Status: policy.status,
      ApprovalDate: policy.approvalDate,
      EffectiveDate: policy.effectiveDate,
      PublishedDate: policy.publishedDate,
      SupersededBy: policy.supersededBy,
      UpdatedAt: policy.updatedAt
    })
  }

  private async createVersionHistoryEntry(
    policy: Policy,
    createdBy: string,
    changesSummary?: string
  ): Promise<void> {
    await this.sharepointService.addListItem('policyVersionHistoryListId', {
      Id: randomUUID(),
      PolicyStableId: policy.policyStableId,
      VersionNumber: policy.versionNumber,
      DocStableId: policy.docStableId,
      Title: policy.title,
      Status: policy.status,
      EffectiveDate: policy.effectiveDate,
      ApprovalDate: policy.approvalDate,
      PublishedDate: policy.publishedDate,
      CreatedAt: policy.createdAt,
      CreatedBy: createdBy,
      ChangesSummary: changesSummary
    })
  }

  private mapSharePointItemToPolicy(item: any): Policy {
    return {
      id: item.fields.Id,
      policyStableId: item.fields.PolicyStableId,
      versionNumber: item.fields.VersionNumber,
      title: item.fields.Title,
      description: item.fields.Description,
      category: item.fields.Category,
      docStableId: item.fields.DocStableId,
      status: item.fields.Status,
      complianceFrameworks: item.fields.ComplianceFrameworks ? item.fields.ComplianceFrameworks.split(',') : [],
      owner: item.fields.Owner,
      reviewCycle: item.fields.ReviewCycle,
      nextReviewDate: item.fields.NextReviewDate,
      effectiveDate: item.fields.EffectiveDate,
      approvalDate: item.fields.ApprovalDate,
      publishedDate: item.fields.PublishedDate,
      supersededBy: item.fields.SupersededBy,
      createdAt: item.fields.CreatedAt,
      createdBy: item.fields.CreatedBy,
      updatedAt: item.fields.UpdatedAt
    }
  }

  private generatePolicyStableId(category: string): string {
    const prefix = 'POL'
    const categoryCode = category.toUpperCase().replace(/\s+/g, '-').substring(0, 10)
    const uuid = randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()
    return `${prefix}-${categoryCode}-${uuid}`
  }
}
