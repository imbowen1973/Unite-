// Appeal Types for Temporary Appellant System

/**
 * Appeal case
 */
export interface Appeal {
  id: string
  reference: string // APP-2025-001

  // Appellant details
  appellantName: string
  appellantEmail: string
  appellantGuestUserId?: string // Links to temporary guest user

  // Appeal details
  appealType: 'academic' | 'disciplinary' | 'grade' | 'admission' | 'other'
  subject: string // Brief description
  description: string // Full appeal details

  // Documents
  supportingDocuments: AppealDocument[]
  requiredDocuments?: string[] // List of required document types

  // Status tracking
  status: 'draft' | 'submitted' | 'under-review' | 'hearing-scheduled' | 'decided' | 'closed'
  submittedAt?: string
  reviewStartedAt?: string
  decidedAt?: string
  closedAt?: string

  // Decision
  decision?: 'upheld' | 'partially-upheld' | 'rejected' | 'withdrawn'
  decisionRationale?: string
  decisionBy?: string

  // Hearing
  hearingDate?: string
  hearingLocation?: string
  hearingAttendees?: string[]

  // Workflow
  assignedTo?: string // Case officer
  reviewPanel?: string[] // Panel members

  // Timeline
  accessExpiresAt: string // When appellant access expires
  responseDeadline?: string // Deadline for institution response

  // Metadata
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy?: string
}

/**
 * Appeal document
 */
export interface AppealDocument {
  id: string
  appealId: string

  // Document details
  fileName: string
  fileSize: number
  fileType: string
  documentType: 'evidence' | 'supporting-letter' | 'medical-certificate' | 'transcript' | 'other'

  // Upload info
  uploadedBy: string
  uploadedAt: string

  // Storage
  documentUrl: string
  docStableId?: string // DMS reference

  // Status
  status: 'uploaded' | 'verified' | 'rejected'
  rejectionReason?: string

  // Metadata
  description?: string
  isRequired: boolean
}

/**
 * Appeal submission
 */
export interface AppealSubmission {
  appealId: string
  submittedBy: string // Appellant guest user ID
  submittedAt: string

  // Submission checklist
  checklist: {
    item: string
    completed: boolean
    required: boolean
  }[]

  // Declaration
  declaration: {
    agreed: boolean
    agreedAt: string
    ipAddress: string
    userAgent: string
  }

  // Final documents included
  documentIds: string[]

  // Confirmation
  confirmationReference: string
  confirmationEmailSent: boolean
}
