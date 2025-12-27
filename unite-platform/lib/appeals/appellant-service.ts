// Appellant Service
// Manages temporary appellant accounts with auto-deletion after appeal finalization

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { GuestUser, AppellantInfo } from '@/types/onboarding'
import { Appeal, AppealDocument, AppealSubmission } from '@/types/appeal'
import { randomUUID } from 'crypto'

export class AppellantService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  /**
   * Create temporary appellant account
   */
  async createAppellantAccount(
    creator: TokenPayload,
    appellantEmail: string,
    appellantName: string,
    appealId: string,
    appealType: AppellantInfo['appealType'],
    accessDurationDays: number = 14
  ): Promise<{ guestUser: GuestUser; appellantInfo: AppellantInfo }> {
    const guestUserId = randomUUID()
    const appealReference = await this.generateAppealReference(appealType)

    const accessExpiresAt = new Date()
    accessExpiresAt.setDate(accessExpiresAt.getDate() + accessDurationDays)

    const appellantInfo: AppellantInfo = {
      appealId,
      appealType,
      appealReference,
      accessGrantedAt: new Date().toISOString(),
      accessExpiresAt: accessExpiresAt.toISOString(),
      documentsUploaded: [],
      deletionStatus: 'pending',
      retainAnonymizedData: true,
    }

    const guestUser: GuestUser = {
      id: guestUserId,
      email: appellantEmail,
      displayName: appellantName,
      guestType: 'temporary-appellant',
      invitedBy: creator.upn,
      invitedAt: new Date().toISOString(),
      committees: [],
      roles: [],
      onboardingStatus: 'completed', // Skip onboarding for appellants
      onboardingSteps: [],
      permissions: ['view-documents', 'view-meetings'], // Limited permissions
      accessExpiry: accessExpiresAt.toISOString(),
      isActive: true,
      mfaEnabled: false, // MFA not required for temporary appellants
      appellantInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Save to SharePoint
    await this.sharepointService.addListItem('guestUsersListId', {
      Id: guestUserId,
      Email: appellantEmail,
      DisplayName: appellantName,
      GuestType: 'temporary-appellant',
      InvitedBy: creator.upn,
      InvitedAt: guestUser.invitedAt,
      Committees: JSON.stringify([]),
      Roles: JSON.stringify([]),
      OnboardingStatus: 'completed',
      OnboardingSteps: JSON.stringify([]),
      Permissions: JSON.stringify(guestUser.permissions),
      AccessExpiry: accessExpiresAt.toISOString(),
      IsActive: true,
      MfaEnabled: false,
      AppellantInfo: JSON.stringify(appellantInfo),
      CreatedAt: guestUser.createdAt,
      UpdatedAt: guestUser.updatedAt,
    })

    // Audit
    await this.auditService.createAuditEvent(
      'appellant.account_created',
      creator.upn,
      {
        guestUserId,
        appellantEmail,
        appealId,
        appealReference,
        accessExpiresAt: accessExpiresAt.toISOString(),
      },
      `create_appellant_${guestUserId}`,
      'unite-appeals'
    )

    // Send access email
    await this.sendAppellantAccessEmail(guestUser, appellantInfo)

    return { guestUser, appellantInfo }
  }

  /**
   * Submit appeal (trigger auto-deletion workflow)
   */
  async submitAppeal(
    appellant: TokenPayload,
    appealId: string,
    guestUserId: string
  ): Promise<AppealSubmission> {
    // Get guest user
    const guestUser = await this.getGuestUser(guestUserId)
    if (!guestUser || guestUser.guestType !== 'temporary-appellant') {
      throw new Error('Invalid appellant account')
    }

    const appellantInfo = guestUser.appellantInfo!

    // Create submission
    const submissionId = randomUUID()
    const confirmationReference = this.generateConfirmationReference()

    const submission: AppealSubmission = {
      appealId,
      submittedBy: guestUserId,
      submittedAt: new Date().toISOString(),
      checklist: [], // Would be populated from actual checklist
      declaration: {
        agreed: true,
        agreedAt: new Date().toISOString(),
        ipAddress: '', // Would be captured from request
        userAgent: '', // Would be captured from request
      },
      documentIds: appellantInfo.documentsUploaded,
      confirmationReference,
      confirmationEmailSent: false,
    }

    // Update appellant info
    appellantInfo.submittedAt = new Date().toISOString()

    await this.sharepointService.updateListItem('guestUsersListId', guestUserId, {
      AppellantInfo: JSON.stringify(appellantInfo),
      UpdatedAt: new Date().toISOString(),
    })

    // Update appeal status
    await this.sharepointService.updateListItem('appealsListId', appealId, {
      Status: 'submitted',
      SubmittedAt: submission.submittedAt,
    })

    // Save submission
    await this.sharepointService.addListItem('appealSubmissionsListId', {
      Id: submissionId,
      AppealId: appealId,
      SubmittedBy: guestUserId,
      SubmittedAt: submission.submittedAt,
      Declaration: JSON.stringify(submission.declaration),
      DocumentIds: JSON.stringify(submission.documentIds),
      ConfirmationReference: confirmationReference,
      ConfirmationEmailSent: false,
    })

    // Audit
    await this.auditService.createAuditEvent(
      'appellant.appeal_submitted',
      appellant.upn,
      {
        appealId,
        guestUserId,
        confirmationReference,
        documentCount: submission.documentIds.length,
      },
      `submit_appeal_${appealId}`,
      'unite-appeals'
    )

    // Send confirmation email
    await this.sendSubmissionConfirmationEmail(guestUser, submission)

    return submission
  }

  /**
   * Finalize appeal (triggers account deletion)
   */
  async finalizeAppeal(
    staff: TokenPayload,
    appealId: string,
    decision: Appeal['decision'],
    decisionRationale: string
  ): Promise<void> {
    // Get appeal
    const appeal = await this.getAppeal(appealId)
    if (!appeal) {
      throw new Error('Appeal not found')
    }

    // Update appeal
    await this.sharepointService.updateListItem('appealsListId', appealId, {
      Status: 'decided',
      Decision: decision,
      DecisionRationale: decisionRationale,
      DecisionBy: staff.upn,
      DecidedAt: new Date().toISOString(),
    })

    // Get appellant account
    if (appeal.appellantGuestUserId) {
      const guestUser = await this.getGuestUser(appeal.appellantGuestUserId)
      if (guestUser && guestUser.appellantInfo) {
        // Update appellant info with finalization
        const appellantInfo = guestUser.appellantInfo
        appellantInfo.finalizedAt = new Date().toISOString()

        // Schedule deletion (e.g., 7 days after finalization to allow download)
        const deletionDate = new Date()
        deletionDate.setDate(deletionDate.getDate() + 7)
        appellantInfo.deletionScheduledAt = deletionDate.toISOString()
        appellantInfo.deletionStatus = 'scheduled'

        await this.sharepointService.updateListItem('guestUsersListId', appeal.appellantGuestUserId, {
          AppellantInfo: JSON.stringify(appellantInfo),
          UpdatedAt: new Date().toISOString(),
        })

        // Send finalization email with deletion notice
        await this.sendFinalizationEmail(guestUser, appeal, decision!, deletionDate)

        // Audit
        await this.auditService.createAuditEvent(
          'appellant.appeal_finalized',
          staff.upn,
          {
            appealId,
            guestUserId: appeal.appellantGuestUserId,
            decision,
            deletionScheduledAt: deletionDate.toISOString(),
          },
          `finalize_appeal_${appealId}`,
          'unite-appeals'
        )
      }
    }
  }

  /**
   * Delete appellant account (executed by scheduled job)
   */
  async deleteAppellantAccount(guestUserId: string): Promise<void> {
    const guestUser = await this.getGuestUser(guestUserId)
    if (!guestUser || guestUser.guestType !== 'temporary-appellant') {
      throw new Error('Not an appellant account')
    }

    const appellantInfo = guestUser.appellantInfo!

    // Check if deletion is scheduled
    if (appellantInfo.deletionStatus !== 'scheduled') {
      throw new Error('Deletion not scheduled for this account')
    }

    // Check if deletion date has passed
    if (new Date(appellantInfo.deletionScheduledAt!) > new Date()) {
      throw new Error('Deletion date has not yet arrived')
    }

    // Create anonymized record for audit
    if (appellantInfo.retainAnonymizedData) {
      await this.createAnonymizedRecord(guestUser, appellantInfo)
    }

    // Disable account
    await this.sharepointService.updateListItem('guestUsersListId', guestUserId, {
      IsActive: false,
      AccountDeletedAt: new Date().toISOString(),
      AppellantInfo: JSON.stringify({
        ...appellantInfo,
        deletionStatus: 'completed',
      }),
    })

    // Audit (using system account)
    await this.auditService.createAuditEvent(
      'appellant.account_deleted',
      'system',
      {
        guestUserId,
        appealId: appellantInfo.appealId,
        appealReference: appellantInfo.appealReference,
        deletedAt: new Date().toISOString(),
      },
      `delete_appellant_${guestUserId}`,
      'unite-appeals'
    )

    // Note: Personal data would be purged from database after a grace period
    // This implementation marks as deleted but retains for audit purposes
  }

  /**
   * Create anonymized record for audit/reporting
   */
  private async createAnonymizedRecord(
    guestUser: GuestUser,
    appellantInfo: AppellantInfo
  ): Promise<void> {
    const anonymizedId = randomUUID()

    await this.sharepointService.addListItem('anonymizedAppellantRecordsListId', {
      Id: anonymizedId,
      AppealId: appellantInfo.appealId,
      AppealReference: appellantInfo.appealReference,
      AppealType: appellantInfo.appealType,
      SubmittedAt: appellantInfo.submittedAt || '',
      FinalizedAt: appellantInfo.finalizedAt || '',
      DocumentCount: appellantInfo.documentsUploaded.length,
      AccountCreatedAt: guestUser.createdAt,
      AccountDeletedAt: new Date().toISOString(),
      // No personal data stored
    })
  }

  /**
   * Send appellant access email
   */
  private async sendAppellantAccessEmail(
    guestUser: GuestUser,
    appellantInfo: AppellantInfo
  ): Promise<void> {
    const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/appeals/${appellantInfo.appealId}`

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appeal Submission Access</h2>

          <p>Dear ${guestUser.displayName},</p>

          <p>You have been granted temporary access to submit documents for your appeal.</p>

          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Appeal Reference:</strong> ${appellantInfo.appealReference}</p>
            <p><strong>Appeal Type:</strong> ${appellantInfo.appealType.replace(/-/g, ' ')}</p>
            <p><strong>Access Expires:</strong> ${new Date(appellantInfo.accessExpiresAt).toLocaleDateString('en-GB')}</p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${accessUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Access Appeal Submission
            </a>
          </p>

          <div style="background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> This is a temporary account. Your account will be automatically deleted once your appeal is finalized. Please save any confirmation documents.</p>
          </div>
        </body>
      </html>
    `

    // TODO: Send email
    console.log(`Sending appellant access email to ${guestUser.email}`)
  }

  /**
   * Send submission confirmation email
   */
  private async sendSubmissionConfirmationEmail(
    guestUser: GuestUser,
    submission: AppealSubmission
  ): Promise<void> {
    const appellantInfo = guestUser.appellantInfo!

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appeal Submitted Successfully</h2>

          <p>Dear ${guestUser.displayName},</p>

          <p>Your appeal has been successfully submitted and received.</p>

          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Confirmation Reference:</strong> ${submission.confirmationReference}</p>
            <p><strong>Appeal Reference:</strong> ${appellantInfo.appealReference}</p>
            <p><strong>Submitted:</strong> ${new Date(submission.submittedAt).toLocaleString('en-GB')}</p>
            <p><strong>Documents:</strong> ${submission.documentIds.length} files</p>
          </div>

          <p>Your appeal will be reviewed by the appropriate panel. You will be notified of the outcome by email.</p>

          <div style="background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Account Deletion Notice:</strong> Your temporary account will be automatically deleted once your appeal is finalized. Please save this email for your records.</p>
          </div>
        </body>
      </html>
    `

    // TODO: Send email
    console.log(`Sending submission confirmation to ${guestUser.email}`)
  }

  /**
   * Send finalization email with deletion notice
   */
  private async sendFinalizationEmail(
    guestUser: GuestUser,
    appeal: Appeal,
    decision: Appeal['decision'],
    deletionDate: Date
  ): Promise<void> {
    const appellantInfo = guestUser.appellantInfo!

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appeal Decision</h2>

          <p>Dear ${guestUser.displayName},</p>

          <p>A decision has been made regarding your appeal.</p>

          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Appeal Reference:</strong> ${appellantInfo.appealReference}</p>
            <p><strong>Decision:</strong> ${decision?.toUpperCase()}</p>
            <p><strong>Decided:</strong> ${new Date(appeal.decidedAt!).toLocaleString('en-GB')}</p>
          </div>

          <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Account Deletion Scheduled</strong></p>
            <p style="margin: 0;">Your temporary account will be deleted on <strong>${deletionDate.toLocaleDateString('en-GB')}</strong>. Please download any documents you need before this date. After deletion, you will no longer be able to access your account.</p>
          </div>

          <p>If you have any questions about this decision, please contact the appeals office.</p>
        </body>
      </html>
    `

    // TODO: Send email
    console.log(`Sending finalization email to ${guestUser.email}`)
  }

  // Helper methods
  private async getGuestUser(guestUserId: string): Promise<GuestUser | null> {
    try {
      const item = await this.sharepointService.getListItem('guestUsersListId', guestUserId)
      return {
        id: item.Id,
        email: item.Email,
        displayName: item.DisplayName,
        guestType: item.GuestType,
        invitedBy: item.InvitedBy,
        invitedAt: item.InvitedAt,
        committees: JSON.parse(item.Committees || '[]'),
        roles: JSON.parse(item.Roles || '[]'),
        onboardingStatus: item.OnboardingStatus,
        onboardingSteps: JSON.parse(item.OnboardingSteps || '[]'),
        permissions: JSON.parse(item.Permissions || '[]'),
        accessExpiry: item.AccessExpiry,
        isActive: item.IsActive,
        mfaEnabled: item.MfaEnabled,
        appellantInfo: item.AppellantInfo ? JSON.parse(item.AppellantInfo) : undefined,
        createdAt: item.CreatedAt,
        updatedAt: item.UpdatedAt,
        accountDeletedAt: item.AccountDeletedAt,
      }
    } catch (error) {
      return null
    }
  }

  private async getAppeal(appealId: string): Promise<Appeal | null> {
    try {
      const item = await this.sharepointService.getListItem('appealsListId', appealId)
      // Map SharePoint item to Appeal type
      return item as Appeal
    } catch (error) {
      return null
    }
  }

  private async generateAppealReference(appealType: string): Promise<string> {
    const year = new Date().getFullYear()
    const typePrefix = appealType.substring(0, 3).toUpperCase()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `APP-${typePrefix}-${year}-${random}`
  }

  private generateConfirmationReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CNF-${timestamp}-${random}`
  }
}
