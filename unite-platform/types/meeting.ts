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
  createdAt: string
  updatedAt: string
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
