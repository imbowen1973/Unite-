// Guest User Onboarding Service
// Manages guest user invitations, onboarding workflow, and email notifications

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import {
  GuestUser,
  GuestInvitation,
  GuestUserType,
  GuestRole,
  GuestPermission,
  OnboardingStep,
  WelcomeEmailTemplate,
  MFASetup,
  OnboardingAnalytics,
} from '@/types/onboarding'
import { randomUUID } from 'crypto'

export class OnboardingService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  /**
   * Invite a guest user
   */
  async inviteGuestUser(
    inviter: TokenPayload,
    email: string,
    displayName: string,
    guestType: GuestUserType,
    committees: string[],
    roles: GuestRole[],
    permissions: GuestPermission[],
    options: {
      personalMessage?: string
      accessExpiry?: string
    } = {}
  ): Promise<GuestInvitation> {
    const invitationId = randomUUID()
    const invitationToken = this.generateSecureToken()

    const invitation: GuestInvitation = {
      id: invitationId,
      email,
      displayName,
      guestType,
      invitedBy: inviter.upn,
      invitedByName: inviter.name,
      committees,
      roles,
      personalMessage: options.personalMessage,
      permissions,
      accessExpiry: options.accessExpiry,
      status: 'sent',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      invitationToken,
    }

    // Save to SharePoint
    await this.sharepointService.addListItem('guestInvitationsListId', {
      Id: invitationId,
      Email: email,
      DisplayName: displayName,
      GuestType: guestType,
      InvitedBy: inviter.upn,
      InvitedByName: inviter.name,
      Committees: JSON.stringify(committees),
      Roles: JSON.stringify(roles),
      PersonalMessage: options.personalMessage || '',
      Permissions: JSON.stringify(permissions),
      AccessExpiry: options.accessExpiry || '',
      Status: 'sent',
      SentAt: invitation.sentAt,
      ExpiresAt: invitation.expiresAt,
      InvitationToken: invitationToken,
    })

    // Send invitation email
    await this.sendInvitationEmail(invitation, inviter)

    // Audit
    await this.auditService.createAuditEvent(
      'onboarding.guest_invited',
      inviter.upn,
      {
        invitationId,
        guestEmail: email,
        guestType,
        committees,
      },
      `invite_guest_${invitationId}`,
      'unite-onboarding'
    )

    return invitation
  }

  /**
   * Accept invitation and create guest user
   */
  async acceptInvitation(
    invitationToken: string,
    acceptedByEmail: string
  ): Promise<{ guestUser: GuestUser; onboardingSteps: OnboardingStep[] }> {
    // Find invitation by token
    const invitationsResponse = await this.sharepointService.getListItems('guestInvitationsListId', {
      filter: `InvitationToken eq '${invitationToken}' and Status eq 'sent'`,
    })

    if (invitationsResponse.value.length === 0) {
      throw new Error('Invalid or expired invitation')
    }

    const invitationData = invitationsResponse.value[0]

    // Check if expired
    if (new Date(invitationData.ExpiresAt) < new Date()) {
      throw new Error('Invitation has expired')
    }

    // Check email matches
    if (invitationData.Email.toLowerCase() !== acceptedByEmail.toLowerCase()) {
      throw new Error('Invitation email does not match')
    }

    // Create guest user
    const guestUserId = randomUUID()

    // Create onboarding steps
    const onboardingSteps = this.createOnboardingSteps(invitationData.GuestType)

    const guestUser: GuestUser = {
      id: guestUserId,
      email: invitationData.Email,
      displayName: invitationData.DisplayName,
      guestType: invitationData.GuestType,
      invitedBy: invitationData.InvitedBy,
      invitedAt: invitationData.SentAt,
      committees: JSON.parse(invitationData.Committees || '[]'),
      roles: JSON.parse(invitationData.Roles || '[]'),
      onboardingStatus: 'in-progress',
      onboardingStartedAt: new Date().toISOString(),
      onboardingSteps,
      permissions: JSON.parse(invitationData.Permissions || '[]'),
      accessExpiry: invitationData.AccessExpiry,
      isActive: true,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Save guest user
    await this.sharepointService.addListItem('guestUsersListId', {
      Id: guestUserId,
      Email: guestUser.email,
      DisplayName: guestUser.displayName,
      GuestType: guestUser.guestType,
      InvitedBy: guestUser.invitedBy,
      InvitedAt: guestUser.invitedAt,
      Committees: JSON.stringify(guestUser.committees),
      Roles: JSON.stringify(guestUser.roles),
      OnboardingStatus: 'in-progress',
      OnboardingStartedAt: guestUser.onboardingStartedAt,
      OnboardingSteps: JSON.stringify(guestUser.onboardingSteps),
      Permissions: JSON.stringify(guestUser.permissions),
      AccessExpiry: guestUser.accessExpiry || '',
      IsActive: true,
      MfaEnabled: false,
      CreatedAt: guestUser.createdAt,
      UpdatedAt: guestUser.updatedAt,
    })

    // Update invitation status
    await this.sharepointService.updateListItem('guestInvitationsListId', invitationData.Id, {
      Status: 'accepted',
      AcceptedAt: new Date().toISOString(),
    })

    // Send welcome email
    await this.sendWelcomeEmail(guestUser)

    // Audit
    await this.auditService.createAuditEvent(
      'onboarding.invitation_accepted',
      acceptedByEmail,
      {
        guestUserId,
        invitationId: invitationData.Id,
      },
      `accept_invitation_${guestUserId}`,
      'unite-onboarding'
    )

    return { guestUser, onboardingSteps }
  }

  /**
   * Complete an onboarding step
   */
  async completeOnboardingStep(
    guestUserId: string,
    stepId: string
  ): Promise<GuestUser> {
    const guestUser = await this.getGuestUser(guestUserId)
    if (!guestUser) {
      throw new Error('Guest user not found')
    }

    // Update step status
    const updatedSteps = guestUser.onboardingSteps.map(step =>
      step.id === stepId
        ? { ...step, status: 'completed' as const, completedAt: new Date().toISOString() }
        : step
    )

    // Check if all steps completed
    const allCompleted = updatedSteps.every(step => step.status === 'completed' || step.status === 'skipped')
    const onboardingStatus = allCompleted ? 'completed' : 'in-progress'
    const onboardingCompletedAt = allCompleted ? new Date().toISOString() : undefined

    // Update guest user
    await this.sharepointService.updateListItem('guestUsersListId', guestUserId, {
      OnboardingSteps: JSON.stringify(updatedSteps),
      OnboardingStatus: onboardingStatus,
      OnboardingCompletedAt: onboardingCompletedAt || '',
      UpdatedAt: new Date().toISOString(),
    })

    // If completed, track analytics
    if (allCompleted) {
      await this.trackOnboardingCompletion(guestUserId)
    }

    return {
      ...guestUser,
      onboardingSteps: updatedSteps,
      onboardingStatus,
      onboardingCompletedAt,
    }
  }

  /**
   * Skip an onboarding step
   */
  async skipOnboardingStep(guestUserId: string, stepId: string): Promise<GuestUser> {
    const guestUser = await this.getGuestUser(guestUserId)
    if (!guestUser) {
      throw new Error('Guest user not found')
    }

    const updatedSteps = guestUser.onboardingSteps.map(step =>
      step.id === stepId
        ? { ...step, status: 'skipped' as const }
        : step
    )

    await this.sharepointService.updateListItem('guestUsersListId', guestUserId, {
      OnboardingSteps: JSON.stringify(updatedSteps),
      UpdatedAt: new Date().toISOString(),
    })

    return {
      ...guestUser,
      onboardingSteps: updatedSteps,
    }
  }

  /**
   * Configure MFA for guest user
   */
  async configureMFA(
    guestUserId: string,
    method: MFASetup['method']
  ): Promise<MFASetup> {
    const setupId = randomUUID()

    const mfaSetup: MFASetup = {
      userId: guestUserId,
      method,
      status: 'not-started',
      backupCodesDownloaded: false,
      createdAt: new Date().toISOString(),
    }

    if (method === 'authenticator-app') {
      // Generate QR code and secret
      const secret = this.generateTOTPSecret()
      const qrCode = await this.generateQRCode(guestUserId, secret)

      mfaSetup.secretKey = secret
      mfaSetup.qrCode = qrCode
      mfaSetup.status = 'qr-displayed'
    }

    // Save MFA setup
    await this.sharepointService.addListItem('mfaSetupsListId', {
      Id: setupId,
      UserId: guestUserId,
      Method: method,
      Status: mfaSetup.status,
      SecretKey: mfaSetup.secretKey || '',
      QRCode: mfaSetup.qrCode || '',
      BackupCodesDownloaded: false,
      CreatedAt: mfaSetup.createdAt,
    })

    return mfaSetup
  }

  /**
   * Verify MFA code
   */
  async verifyMFACode(
    guestUserId: string,
    code: string
  ): Promise<{ verified: boolean; backupCodes?: string[] }> {
    // Get MFA setup
    const setupsResponse = await this.sharepointService.getListItems('mfaSetupsListId', {
      filter: `UserId eq '${guestUserId}' and Status ne 'completed'`,
      orderBy: 'CreatedAt desc',
    })

    if (setupsResponse.value.length === 0) {
      throw new Error('No MFA setup found')
    }

    const setup = setupsResponse.value[0]

    // Verify TOTP code
    const verified = this.verifyTOTPCode(setup.SecretKey, code)

    if (verified) {
      // Generate backup codes
      const backupCodes = this.generateBackupCodes()

      // Update MFA setup
      await this.sharepointService.updateListItem('mfaSetupsListId', setup.Id, {
        Status: 'completed',
        VerifiedAt: new Date().toISOString(),
        CompletedAt: new Date().toISOString(),
        BackupCodes: JSON.stringify(backupCodes),
      })

      // Update guest user
      await this.sharepointService.updateListItem('guestUsersListId', guestUserId, {
        MfaEnabled: true,
        MfaConfiguredAt: new Date().toISOString(),
      })

      // Complete MFA onboarding step
      await this.completeOnboardingStep(guestUserId, 'mfa')

      return { verified: true, backupCodes }
    }

    return { verified: false }
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(
    invitation: GuestInvitation,
    inviter: TokenPayload
  ): Promise<void> {
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/accept?token=${invitation.invitationToken}`

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to Unite Platform</h2>

          <p>Dear ${invitation.displayName},</p>

          <p>${inviter.name} has invited you to join the Unite Platform as a ${this.formatGuestType(invitation.guestType)}.</p>

          ${invitation.personalMessage ? `<p><em>"${invitation.personalMessage}"</em></p>` : ''}

          <h3>Your Access Details:</h3>
          <ul>
            <li><strong>Committees:</strong> ${invitation.roles.map(r => r.committeeName).join(', ')}</li>
            <li><strong>Role:</strong> ${invitation.roles.map(r => r.role).join(', ')}</li>
            <li><strong>Permissions:</strong> ${invitation.permissions.map(p => p.replace(/-/g, ' ')).join(', ')}</li>
          </ul>

          <p style="margin: 30px 0;">
            <a href="${acceptUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Accept Invitation
            </a>
          </p>

          <p style="font-size: 12px; color: #666;">
            This invitation expires in 7 days. If you didn't expect this invitation, please ignore this email.
          </p>

          <p style="font-size: 12px; color: #666;">
            If you have questions, contact ${inviter.name} at ${inviter.email}
          </p>
        </body>
      </html>
    `

    // TODO: Send email using email service
    console.log(`Sending invitation email to ${invitation.email}`)
    console.log(`Accept URL: ${acceptUrl}`)
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(guestUser: GuestUser): Promise<void> {
    const template = this.buildWelcomeEmailTemplate(guestUser)

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${template.subject}</h2>

          <p>${template.greeting}</p>

          <p>${template.introduction}</p>

          <h3>Your Access Details:</h3>
          <ul>
            <li><strong>Committees:</strong> ${template.accessDetails.committees.join(', ')}</li>
            <li><strong>Permissions:</strong> ${template.accessDetails.permissions.join(', ')}</li>
          </ul>

          ${template.accessDetails.firstMeeting ? `
          <h3>Your First Meeting:</h3>
          <p><strong>${template.accessDetails.firstMeeting.title}</strong><br>
          ${new Date(template.accessDetails.firstMeeting.date).toLocaleDateString('en-GB')}</p>
          ` : ''}

          <h3>Next Steps:</h3>
          <ol>
            ${template.nextSteps.map(step => `<li>${step}</li>`).join('')}
          </ol>

          <p style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Start Onboarding
            </a>
          </p>

          <p><strong>Support Contact:</strong><br>
          ${template.supportContact.name} (${template.supportContact.role})<br>
          ${template.supportContact.email}</p>

          <p style="font-size: 12px; color: #666;">${template.footer}</p>
        </body>
      </html>
    `

    // TODO: Send email using email service
    console.log(`Sending welcome email to ${guestUser.email}`)
  }

  /**
   * Build welcome email template
   */
  private buildWelcomeEmailTemplate(guestUser: GuestUser): WelcomeEmailTemplate {
    return {
      subject: 'Welcome to Unite Platform',
      greeting: `Dear ${guestUser.displayName},`,
      introduction: `Welcome to the Unite Platform! We're excited to have you join us as a ${this.formatGuestType(guestUser.guestType)}. This platform will help you participate in meetings, access documents, and collaborate with committees.`,
      accessDetails: {
        committees: guestUser.roles.map(r => r.committeeName),
        permissions: guestUser.permissions.map(p => p.replace(/-/g, ' ')),
      },
      nextSteps: [
        'Complete your profile to help others know more about you',
        'Set up multi-factor authentication (MFA) to secure your account',
        'Take a quick tour to familiarize yourself with the platform',
        'Review your committee assignments and upcoming meetings',
        'Download the mobile app for on-the-go access',
      ],
      supportContact: {
        name: 'Platform Support Team',
        email: 'support@university.ac.uk',
        role: 'Technical Support',
      },
      footer: 'This is an automated message from Unite Platform. Please do not reply to this email.',
    }
  }

  /**
   * Create onboarding steps for guest type
   */
  private createOnboardingSteps(guestType: GuestUserType): OnboardingStep[] {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        type: 'welcome',
        title: 'Welcome',
        description: 'Introduction to Unite Platform',
        status: 'pending',
        order: 1,
      },
      {
        id: 'profile',
        type: 'profile',
        title: 'Complete Profile',
        description: 'Add your details and expertise',
        status: 'pending',
        order: 2,
      },
      {
        id: 'mfa',
        type: 'mfa',
        title: 'Setup MFA',
        description: 'Secure your account with multi-factor authentication',
        status: 'pending',
        order: 3,
      },
      {
        id: 'permissions',
        type: 'permissions',
        title: 'Understand Permissions',
        description: 'Learn what you can access and do',
        status: 'pending',
        order: 4,
      },
      {
        id: 'committees',
        type: 'committees',
        title: 'Your Committees',
        description: 'Review your committee assignments',
        status: 'pending',
        order: 5,
      },
      {
        id: 'tour',
        type: 'tour',
        title: 'Platform Tour',
        description: 'Interactive guide to key features',
        status: 'pending',
        order: 6,
      },
      {
        id: 'complete',
        type: 'complete',
        title: 'All Done!',
        description: 'Onboarding completed successfully',
        status: 'pending',
        order: 7,
      },
    ]

    return baseSteps
  }

  /**
   * Track onboarding completion
   */
  private async trackOnboardingCompletion(guestUserId: string): Promise<void> {
    const guestUser = await this.getGuestUser(guestUserId)
    if (!guestUser) return

    const analytics: OnboardingAnalytics = {
      guestUserId,
      invitedAt: guestUser.invitedAt,
      firstLoginAt: guestUser.onboardingStartedAt,
      onboardingCompletedAt: new Date().toISOString(),
      timeToComplete: guestUser.onboardingStartedAt
        ? Math.floor(
            (new Date().getTime() - new Date(guestUser.onboardingStartedAt).getTime()) / 60000
          )
        : 0,
      stepsCompleted: guestUser.onboardingSteps.filter(s => s.status === 'completed').length,
      stepsSkipped: guestUser.onboardingSteps.filter(s => s.status === 'skipped').length,
      totalSteps: guestUser.onboardingSteps.length,
      tourViewed: guestUser.onboardingSteps.some(s => s.id === 'tour' && s.status === 'completed'),
      tourCompleted: guestUser.onboardingSteps.some(s => s.id === 'tour' && s.status === 'completed'),
      mfaConfigured: guestUser.mfaEnabled,
      profileCompleted: guestUser.onboardingSteps.some(s => s.id === 'profile' && s.status === 'completed'),
      status: 'completed',
    }

    // Save analytics
    await this.sharepointService.addListItem('onboardingAnalyticsListId', {
      GuestUserId: guestUserId,
      InvitedAt: analytics.invitedAt,
      FirstLoginAt: analytics.firstLoginAt || '',
      OnboardingCompletedAt: analytics.onboardingCompletedAt,
      TimeToComplete: analytics.timeToComplete,
      StepsCompleted: analytics.stepsCompleted,
      StepsSkipped: analytics.stepsSkipped,
      TotalSteps: analytics.totalSteps,
      TourViewed: analytics.tourViewed,
      TourCompleted: analytics.tourCompleted,
      MfaConfigured: analytics.mfaConfigured,
      ProfileCompleted: analytics.profileCompleted,
      Status: analytics.status,
    })
  }

  // Helper methods
  private async getGuestUser(guestUserId: string): Promise<GuestUser | null> {
    try {
      const item = await this.sharepointService.getListItem('guestUsersListId', guestUserId)
      return {
        id: item.Id,
        email: item.Email,
        displayName: item.DisplayName,
        organization: item.Organization,
        guestType: item.GuestType,
        invitedBy: item.InvitedBy,
        invitedAt: item.InvitedAt,
        committees: JSON.parse(item.Committees || '[]'),
        roles: JSON.parse(item.Roles || '[]'),
        onboardingStatus: item.OnboardingStatus,
        onboardingStartedAt: item.OnboardingStartedAt,
        onboardingCompletedAt: item.OnboardingCompletedAt,
        onboardingSteps: JSON.parse(item.OnboardingSteps || '[]'),
        permissions: JSON.parse(item.Permissions || '[]'),
        accessExpiry: item.AccessExpiry,
        isActive: item.IsActive,
        mfaEnabled: item.MfaEnabled,
        mfaConfiguredAt: item.MfaConfiguredAt,
        biography: item.Biography,
        expertise: item.Expertise ? JSON.parse(item.Expertise) : [],
        linkedIn: item.LinkedIn,
        createdAt: item.CreatedAt,
        updatedAt: item.UpdatedAt,
        lastLoginAt: item.LastLoginAt,
      }
    } catch (error) {
      return null
    }
  }

  private generateSecureToken(): string {
    return randomUUID() + '-' + randomUUID()
  }

  private formatGuestType(type: GuestUserType): string {
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  private generateTOTPSecret(): string {
    // Generate a base32 secret for TOTP
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return secret
  }

  private async generateQRCode(userId: string, secret: string): Promise<string> {
    // Generate QR code data URL for authenticator app
    const issuer = 'Unite Platform'
    const account = userId
    const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`

    // TODO: Use QR code library to generate actual QR code
    // For now, return the URL (would normally return data:image/png;base64,...)
    return `data:text/plain;base64,${Buffer.from(otpauthUrl).toString('base64')}`
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    // TODO: Implement actual TOTP verification using a library like otplib
    // For now, return true if code is 6 digits
    return /^\d{6}$/.test(code)
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      let code = ''
      for (let j = 0; j < 8; j++) {
        code += Math.floor(Math.random() * 10)
      }
      codes.push(code.match(/.{1,4}/g)!.join('-')) // Format as 1234-5678
    }
    return codes
  }
}
