// Meeting-related types for Unite Platform

export interface Meeting {
  id: string
  docStableId: string // For permanent reference
  title: string
  committee: string
  scheduledDate: string
  status: 'draft' | 'published' | 'in-progress' | 'completed' | 'cancelled'
  organizer: string
  attendees: string[]
  createdAt: string
  updatedAt: string
  permissions: {
    canViewBeforePublish: string[] // User IDs or group IDs
    canEdit: string[]
    canApprove: string[]
    canPublish: string[]
  }
}

export interface AgendaItem {
  id: string
  meetingId: string
  title: string
  description: string

  // Hierarchical ordering
  itemOrder: number // Position in the agenda (e.g., 7, 8, 9)
  parentItemId?: string // Link to parent item for sub-points
  orderPath: string // Full path for sorting (e.g., "7", "7.1", "7.2", "7.2.1")
  level: number // Depth level (0 = top level, 1 = first sub-item, etc.)

  // Time management
  startTime?: string // ISO timestamp - calculated from meeting start + previous items
  timeAllocation: number // in minutes (duration)
  endTime?: string // ISO timestamp - calculated as startTime + timeAllocation

  documentId?: string
  docStableId?: string
  presenter?: string
  status: 'pending' | 'in-progress' | 'discussed' | 'deferred' | 'completed'
  supportingDocuments: string[] // docStableIds of supporting documents
  voteRequired: 'none' | 'approval' | 'opinion'
  voteType?: 'simple-majority' | 'super-majority' | 'unanimous'
  role: 'information' | 'action' | 'decision' | 'voting' | 'discussion' | 'break' // Role-based categorization
  discussionOutcome?: string

  // Strategy linking
  strategyLinks?: StrategyLink[] // Links to strategy items this agenda item contributes to

  createdAt: string
  updatedAt: string
}

// Strategy link for agenda/minute items
export interface StrategyLink {
  strategyItemId: string
  contributionType: 'initiate' | 'support' | 'related-to' | 'deliver-towards' | 'review' | 'monitor' | 'finalise' | 'report'
  contributionDescription?: string
}

export interface MeetingAction {
  id: string
  meetingId: string
  agendaItemId: string
  title: string
  description: string
  assignedTo: string[]
  dueDate: string
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
  completionCriteria?: string
  createdAt: string
  completedAt?: string
  createdBy: string
  plannerTaskId?: string // Link to Microsoft Planner task
}

export interface MeetingVote {
  id: string
  meetingId: string
  agendaItemId: string
  voteType: 'approval' | 'opinion'
  title: string
  description: string
  options: string[] // Options for the vote
  status: 'pending' | 'in-progress' | 'completed'
  requiredVotingPower: 'simple-majority' | 'super-majority' | 'unanimous'
  createdAt: string
  completedAt?: string
  createdBy: string
}

export interface VoteRecord {
  id: string
  voteId: string
  voter: string // User ID
  voteOption: string // Selected option
  votingPower: number // Weight of vote (for delegates)
  isPublic: boolean // Whether individual votes are public
  recordedAt: string
}

export interface MeetingPack {
  id: string
  meetingId: string
  title: string
  documents: string[] // docStableIds
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  status: 'draft' | 'pending-approval' | 'approved' | 'published'
}

export interface VotingPattern {
  id: string
  meetingId: string
  voter: string // User ID
  voteRecordId: string
  decision: string // The actual vote choice
  timestamp: string
}

export type AgendaItemRole = 'information' | 'action' | 'decision' | 'voting' | 'discussion' | 'break';

// Meeting configuration
export interface MeetingConfiguration {
  meetingId: string
  startTime: string // ISO timestamp for when meeting starts
  allowSubItems: boolean // Whether to enable hierarchical agenda items
  autoCalculateTimes: boolean // Whether to auto-calculate start/end times
  defaultBreakDuration: number // Default break duration in minutes
}

// Helper type for agenda reordering
export interface AgendaReorderOperation {
  itemId: string
  newOrderPath: string
  newItemOrder: number
  affectedChildrenIds: string[] // Children that move with parent
}

// Meeting Minutes
export interface MinuteItem {
  id: string
  meetingId: string
  agendaItemId: string // Links to corresponding agenda item

  // Content from agenda item (copied for reference)
  agendaTitle: string
  agendaPurpose: string
  orderPath: string // Matches agenda item orderPath for sorting
  level: number // Matches agenda item level

  // Discussion content
  discussion: string // Main discussion text (extracted from transcript or manual)
  discussionSummary?: string // AI-generated summary
  keyPoints?: string[] // Bullet points of key discussion

  // Decisions and outcomes
  decision?: string // Final decision or outcome
  votingResult?: {
    voteId: string
    outcome: string
    votesFor: number
    votesAgainst: number
    abstentions: number
  }

  // Actions arising from this item
  actions: string[] // Array of MeetingAction IDs

  // Attendance for this item (if someone arrived/left during meeting)
  presenters?: string[] // Who presented this item

  // Strategy linking
  strategyLinks?: StrategyLink[] // Links to strategy items this minute contributes to

  // Metadata
  status: 'draft' | 'reviewed' | 'approved' // Minute approval workflow
  lastEditedBy?: string
  lastEditedAt?: string
  approvedBy?: string
  approvedAt?: string

  // AI processing
  transcriptSegment?: {
    startTime: string // Timestamp in recording
    endTime: string // Timestamp in recording
    transcriptText: string // Raw transcript for this item
    confidenceScore?: number // AI confidence in extraction
  }

  createdAt: string
  updatedAt: string
}

// Meeting transcript for AI processing
export interface MeetingTranscript {
  id: string
  meetingId: string

  // Recording information
  recordingUrl?: string // Link to Teams/Zoom recording
  recordingDuration?: number // Duration in seconds

  // Transcript content
  transcriptText: string // Full transcript
  transcriptFormat: 'plain' | 'vtt' | 'srt' | 'json' // Format of transcript

  // Timestamp-based segments
  segments?: TranscriptSegment[]

  // Speaker identification
  speakers?: SpeakerInfo[]

  // Processing metadata
  uploadedBy: string
  uploadedAt: string
  processedAt?: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string

  // AI extraction results
  extractedMinutes?: {
    agendaItemId: string
    extractedDiscussion: string
    confidenceScore: number
    suggestedActions: string[]
  }[]
}

export interface TranscriptSegment {
  startTime: string // Timestamp (e.g., "00:15:30")
  endTime: string // Timestamp (e.g., "00:18:45")
  speaker?: string // Speaker name/ID
  text: string // Transcript text for this segment
}

export interface SpeakerInfo {
  speakerId: string
  speakerName: string
  email?: string
  speakingDuration?: number // Total seconds spoken
}

// Complete meeting minutes document
export interface MeetingMinutes {
  id: string
  meetingId: string

  // Metadata
  meetingTitle: string
  committee: string
  meetingDate: string
  startTime: string
  endTime: string
  location?: string

  // Attendance
  attendees: AttendanceRecord[]
  apologies: string[] // People who sent apologies
  absent: string[] // People who were absent without apology

  // Minutes content (from MinuteItems list)
  minuteItems: string[] // Array of MinuteItem IDs

  // Additional sections
  additionalNotes?: string // General notes not tied to specific agenda items
  nextMeetingDate?: string

  // Document status
  status: 'draft' | 'circulated' | 'approved' | 'published'
  circulatedAt?: string
  circulatedBy?: string
  approvedAt?: string
  approvedBy?: string

  // PDF export
  pdfUrl?: string // Link to exported PDF
  pdfGeneratedAt?: string

  createdAt: string
  updatedAt: string
  version: string // Version number for tracking changes
}

export interface AttendanceRecord {
  userId: string
  displayName: string
  email: string
  role?: string // Chair, Secretary, Member, Observer
  status: 'present' | 'apologies' | 'absent'
  arrivedAt?: string // If arrived late
  leftAt?: string // If left early
}
