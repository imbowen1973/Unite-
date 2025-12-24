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
  itemOrder: number // Position in the agenda
  documentId?: string
  docStableId?: string
  presenter?: string
  timeAllocation: number // in minutes
  status: 'pending' | 'in-progress' | 'discussed' | 'deferred' | 'completed'
  supportingDocuments: string[] // docStableIds of supporting documents
  voteRequired: 'none' | 'approval' | 'opinion'
  voteType?: 'simple-majority' | 'super-majority' | 'unanimous'
  role: 'information' | 'action' | 'decision' | 'voting' | 'discussion' // Role-based categorization
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

export type AgendaItemRole = 'information' | 'action' | 'decision' | 'voting' | 'discussion';
