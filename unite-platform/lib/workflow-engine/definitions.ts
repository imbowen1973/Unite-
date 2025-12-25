// Workflow Engine - Type Definitions for Unite Platform
// Enables configurable workflows without code deployment

import { DocumentState, AccessLevel } from '@/lib/access'

// ============================================================================
// WORKFLOW DEFINITION TYPES
// ============================================================================

/**
 * A complete workflow definition that can be stored in SharePoint
 * and executed by the workflow engine
 */
export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  version: string
  category: string // e.g., "complaint", "approval", "review"
  isActive: boolean
  createdAt: string
  createdBy: string
  updatedAt: string

  // State machine definition
  states: WorkflowState[]
  transitions: WorkflowTransition[]

  // Assignment rules - when does this workflow apply?
  assignmentRules: WorkflowAssignmentRule[]

  // Custom fields for this workflow
  fields: WorkflowField[]

  // Automation hooks
  automations?: WorkflowAutomation[]

  // Settings
  settings: WorkflowSettings
}

/**
 * A state in the workflow state machine
 */
export interface WorkflowState {
  id: string
  label: string
  description?: string
  color?: string // For UI display (e.g., "blue", "green", "red")
  icon?: string
  isInitial?: boolean // First state when workflow starts
  isFinal?: boolean // Terminal state

  // What can users do in this state?
  allowedActions?: string[] // e.g., ["edit", "comment", "upload_evidence"]

  // Auto-actions when entering this state
  onEnter?: StateAction[]
  onExit?: StateAction[]

  // Time-based rules
  sla?: {
    maxDuration: number // In hours
    warningAt: number // Warn after X hours
    escalateTo?: string // User role to escalate to
  }
}

/**
 * A transition between states
 */
export interface WorkflowTransition {
  id: string
  label: string // Button label, e.g., "Submit for Review"
  from: string // State ID
  to: string // State ID

  // Who can perform this transition?
  requiredRoles?: string[] // e.g., ["Admin", "Board"]
  requiredAccessLevel?: AccessLevel
  requiredCommittees?: string[]

  // Conditions that must be met
  conditions?: WorkflowCondition[]

  // Additional requirements
  requiresComment?: boolean
  requiresVote?: boolean
  voteType?: 'simple-majority' | 'two-thirds' | 'unanimous'
  requiresAttachments?: boolean
  minAttachments?: number

  // Actions to perform when transition occurs
  actions?: TransitionAction[]

  // Confirmation message
  confirmationMessage?: string
}

/**
 * Rules that determine when this workflow applies
 */
export interface WorkflowAssignmentRule {
  id: string
  priority: number // Higher priority rules checked first

  // Match criteria (ALL must match for rule to apply)
  documentType?: string[] // e.g., ["complaint", "grievance"]
  documentCategory?: string[] // e.g., ["student", "staff"]
  committee?: string[] // Assigned committees
  tags?: string[] // Document tags

  // Custom field matching
  customFieldMatches?: {
    fieldName: string
    operator: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan'
    value: any
  }[]

  // Advanced JavaScript condition (evaluated safely)
  advancedCondition?: string // e.g., "document.value > 10000 && document.region === 'UK'"
}

/**
 * Custom fields for workflow instances
 */
export interface WorkflowField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'document' | 'user'
  required: boolean
  description?: string

  // Validation
  validation?: {
    min?: number
    max?: number
    pattern?: string // Regex pattern
    options?: string[] // For select/multiselect
    customValidator?: string // JavaScript function
  }

  // When is this field visible/editable?
  visibleInStates?: string[] // If not specified, visible in all states
  editableInStates?: string[] // If not specified, editable in all states
  requiredInStates?: string[] // Additional required states beyond initial

  // Default value
  defaultValue?: any
}

/**
 * Conditions that must be met for a transition
 */
export interface WorkflowCondition {
  type: 'field' | 'role' | 'time' | 'vote' | 'custom'

  // Field conditions
  fieldName?: string
  operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty'
  value?: any

  // Role conditions
  userMustHaveRole?: string[]
  userMustBeInCommittee?: string[]

  // Time conditions
  minimumTimeInState?: number // Hours
  maximumTimeInState?: number // Hours

  // Vote conditions
  voteMustPass?: boolean

  // Custom JavaScript condition
  customCondition?: string
}

/**
 * Actions to perform automatically
 */
export interface StateAction {
  type: 'notify' | 'assign' | 'createTask' | 'updateField' | 'webhook'

  // Notify action
  notifyRoles?: string[]
  notifyUsers?: string[]
  notifyCommittees?: string[]
  notificationTemplate?: string

  // Assign action
  assignToRole?: string
  assignToUser?: string
  assignToCommittee?: string

  // Create task action (Planner integration)
  taskTitle?: string
  taskDescription?: string
  taskAssignee?: string
  taskDueInDays?: number

  // Update field action
  fieldName?: string
  fieldValue?: any

  // Webhook action
  webhookUrl?: string
  webhookPayload?: Record<string, any>
}

/**
 * Actions to perform during transitions
 */
export interface TransitionAction {
  type: 'audit' | 'notify' | 'document' | 'archive' | 'webhook' | 'custom'

  // Audit action
  auditMessage?: string
  auditSeverity?: 'info' | 'warning' | 'error'

  // Notify action
  notifyRoles?: string[]
  notifyUsers?: string[]
  notificationMessage?: string

  // Document action
  moveDocumentTo?: string // Folder path
  documentStateChange?: DocumentState
  createDocumentCopy?: boolean

  // Archive action
  archiveAfterDays?: number

  // Webhook action
  webhookUrl?: string

  // Custom JavaScript action
  customAction?: string
}

/**
 * Automation definitions
 */
export interface WorkflowAutomation {
  id: string
  name: string
  trigger: 'stateEnter' | 'stateExit' | 'timeElapsed' | 'fieldChanged' | 'voteCast'

  // Trigger conditions
  triggerState?: string // For state triggers
  triggerField?: string // For field change triggers
  timeElapsed?: number // Hours

  // Actions to perform
  actions: StateAction[]

  // Conditions
  conditions?: WorkflowCondition[]
}

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  // Access control
  allowedAccessLevels: AccessLevel[]
  allowedCommittees?: string[]
  allowedRoles?: string[]

  // Document settings
  requireDocument: boolean
  allowMultipleDocuments: boolean
  allowedFileTypes?: string[] // e.g., ["pdf", "docx"]
  maxFileSize?: number // In MB

  // Versioning
  enableVersionHistory: boolean
  autoVersionOnStateChange: boolean

  // Notifications
  enableEmailNotifications: boolean
  enableTeamsNotifications: boolean

  // Audit
  auditAllActions: boolean
  retentionPeriod?: number // Days

  // Integration
  dmsLibrary?: string // Which DMS library to use
  siteCollection?: string // Which SharePoint site
}

// ============================================================================
// WORKFLOW INSTANCE TYPES
// ============================================================================

/**
 * A running instance of a workflow
 */
export interface WorkflowInstance {
  id: string
  workflowDefinitionId: string
  workflowVersion: string

  // Current state
  currentState: string
  stateEnteredAt: string

  // Document reference
  docStableId?: string

  // Custom field values
  fieldValues: Record<string, any>

  // Assignment
  assignedTo?: string // User OID
  assignedCommittee?: string

  // Audit trail
  history: WorkflowHistoryEntry[]

  // Status
  status: 'active' | 'completed' | 'cancelled' | 'error'

  // Timestamps
  startedAt: string
  startedBy: string
  completedAt?: string
  updatedAt: string
}

/**
 * History entry for workflow instance
 */
export interface WorkflowHistoryEntry {
  id: string
  timestamp: string
  actor: string // User UPN
  action: 'transition' | 'fieldUpdate' | 'comment' | 'assignment' | 'vote'

  // Transition details
  fromState?: string
  toState?: string
  transitionId?: string

  // Field update details
  fieldName?: string
  oldValue?: any
  newValue?: any

  // Comment
  comment?: string

  // Vote details
  voteResult?: 'for' | 'against' | 'abstain'

  // Metadata
  metadata?: Record<string, any>
}

/**
 * Vote on a workflow instance
 */
export interface WorkflowVote {
  instanceId: string
  transitionId: string
  voteType: 'simple-majority' | 'two-thirds' | 'unanimous'

  votes: {
    userId: string
    vote: 'for' | 'against' | 'abstain'
    comment?: string
    timestamp: string
  }[]

  requiredVotes: number
  votesFor: number
  votesAgainst: number
  votesAbstain: number

  status: 'pending' | 'passed' | 'failed'
  closedAt?: string
}

// ============================================================================
// WORKFLOW TEMPLATE TYPES (Pre-built workflow templates)
// ============================================================================

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  icon?: string

  // The workflow definition (can be cloned and customized)
  definition: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>

  // Examples and documentation
  useCases?: string[]
  exampleFields?: WorkflowField[]
  setupInstructions?: string
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  WorkflowAssignmentRule,
  WorkflowField,
  WorkflowCondition,
  StateAction,
  TransitionAction,
  WorkflowAutomation,
  WorkflowSettings,
  WorkflowInstance,
  WorkflowHistoryEntry,
  WorkflowVote,
  WorkflowTemplate,
}
