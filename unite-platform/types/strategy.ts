// Strategic Planning and Tracking Types

/**
 * Contribution type - how an activity relates to a strategy item
 */
export type StrategyContributionType =
  | 'initiate' // Starts work on this strategy item
  | 'support' // Supports delivery of this strategy
  | 'related-to' // Related discussion or consideration
  | 'deliver-towards' // Makes progress toward delivery
  | 'review' // Reviews progress on this strategy
  | 'monitor' // Monitors implementation
  | 'finalise' // Completes or finalizes this strategy item
  | 'report' // Reports on outcomes

/**
 * Strategy Item - individual strategic objective
 */
export interface StrategyItem {
  id: string
  strategyId: string // Links to parent Strategy

  // Content
  title: string
  description: string
  orderNumber: number // Display order (1, 2, 3...)

  // Categorization
  theme?: string // e.g., "Student Experience", "Research Excellence"
  priority: 'high' | 'medium' | 'low'
  owner?: string // Responsible person/department

  // Targets and metrics
  targetOutcome?: string // What success looks like
  keyMetrics?: StrategyMetric[] // Measurable indicators
  milestones?: Milestone[] // Key milestones

  // Timeline
  startDate?: string // When work should begin
  targetCompletionDate?: string // When it should be completed
  actualCompletionDate?: string // When it was actually completed

  // Status
  status: 'not-started' | 'in-progress' | 'on-track' | 'at-risk' | 'delayed' | 'completed' | 'cancelled'
  progressPercentage: number // 0-100

  // Linked activities
  linkedActivities: LinkedActivity[] // Agenda/minute items linked to this strategy

  // Metadata
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy?: string
}

/**
 * Strategy - overarching strategic plan (e.g., 5-year plan)
 */
export interface Strategy {
  id: string

  // Basic info
  title: string // e.g., "University Strategy 2025-2030"
  description: string
  vision?: string // Long-term vision statement

  // Timeframe
  startYear: number // e.g., 2025
  endYear: number // e.g., 2030

  // Organization
  themes?: string[] // Strategic themes/pillars
  items: string[] // Array of StrategyItem IDs

  // Status
  status: 'draft' | 'active' | 'under-review' | 'completed' | 'archived'
  isCurrentStrategy: boolean // Is this the active strategy?

  // Documents
  documentId?: string // Link to strategy document in DMS
  docStableId?: string // Stable reference

  // Metadata
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy?: string
  approvedAt?: string
  approvedBy?: string
}

/**
 * Linked Activity - connection between strategy and meeting activity
 */
export interface LinkedActivity {
  id: string
  strategyItemId: string

  // Activity reference
  activityType: 'agenda-item' | 'minute-item' | 'action' | 'decision'
  activityId: string // ID of the linked activity

  // Context from activity
  meetingId: string
  meetingTitle: string
  meetingDate: string
  committee: string
  itemTitle: string // Agenda/minute item title

  // Contribution details
  contributionType: StrategyContributionType
  contributionDescription?: string // How this activity contributes
  outcomes?: string // What was achieved

  // Metadata
  linkedAt: string
  linkedBy: string
}

/**
 * Strategy Metric - measurable indicator
 */
export interface StrategyMetric {
  id: string
  name: string // e.g., "Student Satisfaction Score"
  unit: string // e.g., "%", "number", "score"

  baseline?: number // Starting value
  target: number // Target value
  current?: number // Current value

  measurementFrequency?: 'monthly' | 'quarterly' | 'annually'
  lastMeasured?: string // Last measurement date
}

/**
 * Milestone - key milestone in strategy delivery
 */
export interface Milestone {
  id: string
  title: string
  description?: string

  targetDate: string
  completedDate?: string

  status: 'pending' | 'in-progress' | 'completed' | 'overdue'
}

/**
 * Strategy Progress Summary
 */
export interface StrategyProgressSummary {
  strategyId: string
  strategyTitle: string

  // Overall progress
  totalItems: number
  completedItems: number
  inProgressItems: number
  notStartedItems: number
  atRiskItems: number

  // Activity metrics
  totalLinkedActivities: number
  activitiesByContributionType: {
    [key in StrategyContributionType]: number
  }

  // Timeline
  daysRemaining: number
  percentageTimeElapsed: number
  isOnTrack: boolean

  // Recent activity
  recentActivities: LinkedActivity[]
  upcomingMilestones: Milestone[]
}

/**
 * Strategy Dashboard Card Data
 */
export interface StrategyCardData {
  item: StrategyItem
  activityCount: number
  lastActivityDate?: string
  progressTrend: 'improving' | 'stable' | 'declining'
  statusColor: string // For UI visualization
}
