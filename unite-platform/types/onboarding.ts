// Guest User Onboarding Types

/**
 * Guest user type - external users invited to participate
 */
export type GuestUserType =
  | 'external-committee-member' // External member of a committee
  | 'observer' // Observer at meetings
  | 'co-opted-member' // Co-opted member with voting rights
  | 'visiting-academic' // Visiting academic
  | 'industry-partner' // Industry/business partner
  | 'student-rep' // Student representative
  | 'external-reviewer' // External reviewer/auditor

/**
 * Guest user profile
 */
export interface GuestUser {
  id: string
  email: string
  displayName: string
  organization?: string // External organization

  // Guest type and context
  guestType: GuestUserType
  invitedBy: string // Staff member who invited them
  invitedAt: string

  // Committee/group assignments
  committees: string[] // Committee IDs they're assigned to
  roles: GuestRole[] // Roles within committees

  // Onboarding status
  onboardingStatus: 'pending' | 'in-progress' | 'completed' | 'skipped'
  onboardingStartedAt?: string
  onboardingCompletedAt?: string
  onboardingSteps: OnboardingStep[]

  // Access and permissions
  permissions: GuestPermission[]
  accessExpiry?: string // Optional access expiration date
  isActive: boolean

  // MFA status
  mfaEnabled: boolean
  mfaConfiguredAt?: string

  // Profile
  biography?: string
  expertise?: string[]
  linkedIn?: string

  // Metadata
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

/**
 * Guest role within a committee
 */
export interface GuestRole {
  committeeId: string
  committeeName: string
  role: 'member' | 'observer' | 'chair' | 'co-opted'
  votingRights: boolean
  canViewDocuments: boolean
  canContribute: boolean
}

/**
 * Guest permissions
 */
export type GuestPermission =
  | 'view-meetings' // Can view meetings they're invited to
  | 'view-documents' // Can view meeting documents
  | 'view-minutes' // Can view minutes
  | 'vote' // Can vote in meetings
  | 'contribute-agenda' // Can suggest agenda items
  | 'access-dms' // Can access document management
  | 'view-strategy' // Can view organizational strategy

/**
 * Onboarding step
 */
export interface OnboardingStep {
  id: string
  type: 'welcome' | 'profile' | 'mfa' | 'tour' | 'permissions' | 'committees' | 'complete'
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'skipped'
  completedAt?: string
  order: number
}

/**
 * Welcome email template
 */
export interface WelcomeEmailTemplate {
  subject: string
  greeting: string
  introduction: string // Personalized introduction
  accessDetails: {
    committees: string[] // Committees they're assigned to
    permissions: string[] // What they can do
    firstMeeting?: {
      title: string
      date: string
    }
  }
  nextSteps: string[] // Bullet points of what to do next
  supportContact: {
    name: string
    email: string
    role: string
  }
  footer: string
}

/**
 * Shepherd tour step - interactive guide
 */
export interface ShepherdStep {
  id: string
  target: string // CSS selector for element to highlight
  title: string
  text: string // Step description
  attachTo?: {
    element: string
    on: 'top' | 'bottom' | 'left' | 'right'
  }
  buttons?: ShepherdButton[]
  when?: {
    show?: () => void
    hide?: () => void
  }
}

export interface ShepherdButton {
  text: string
  action: 'next' | 'back' | 'complete' | 'skip'
  classes?: string
}

/**
 * Onboarding tour - complete guided tour
 */
export interface OnboardingTour {
  id: string
  name: string
  description: string
  guestType: GuestUserType // Tour customized per guest type
  steps: ShepherdStep[]
  isActive: boolean
}

/**
 * MFA setup configuration
 */
export interface MFASetup {
  userId: string
  method: 'authenticator-app' | 'sms' | 'email' | 'phone-call'
  status: 'not-started' | 'qr-displayed' | 'code-verified' | 'completed' | 'failed'

  // For authenticator app
  qrCode?: string // Data URL for QR code
  secretKey?: string // Manual entry key

  // For SMS/phone
  phoneNumber?: string

  // Verification
  verificationCode?: string
  verifiedAt?: string

  // Backup codes
  backupCodes?: string[]
  backupCodesDownloaded: boolean

  createdAt: string
  completedAt?: string
}

/**
 * Onboarding analytics
 */
export interface OnboardingAnalytics {
  guestUserId: string

  // Timing metrics
  invitedAt: string
  firstLoginAt?: string
  onboardingCompletedAt?: string
  timeToComplete?: number // Minutes from start to completion

  // Step completion
  stepsCompleted: number
  stepsSkipped: number
  totalSteps: number

  // Engagement
  tourViewed: boolean
  tourCompleted: boolean
  mfaConfigured: boolean
  profileCompleted: boolean

  // Outcome
  status: 'abandoned' | 'in-progress' | 'completed'
  abandonedAt?: string
  abandonedStep?: string
}

/**
 * Invitation to become guest user
 */
export interface GuestInvitation {
  id: string
  email: string
  displayName: string
  guestType: GuestUserType

  // Context
  invitedBy: string // Staff member UPN
  invitedByName: string
  committees: string[]
  roles: GuestRole[]

  // Message
  personalMessage?: string // Custom message from inviter

  // Access
  permissions: GuestPermission[]
  accessExpiry?: string

  // Status
  status: 'sent' | 'accepted' | 'declined' | 'expired'
  sentAt: string
  acceptedAt?: string
  expiresAt: string // Invitation expiry

  // Token for acceptance
  invitationToken: string // Secure token for one-time acceptance
}
