// Workflow Engine Service for Unite Platform
// Executes configurable workflows without code deployment

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel } from '@/lib/access'
import { DMSService } from '@/lib/dms'
import { DocumentWorkflowService } from '@/lib/workflow'
import { randomUUID } from 'crypto'
import { kv } from '@vercel/kv'

import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTransition,
  WorkflowState,
  WorkflowCondition,
  WorkflowHistoryEntry,
  WorkflowVote,
  TransitionAction,
  StateAction,
} from './definitions'

export class WorkflowEngineService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService
  private dmsService: DMSService
  private documentWorkflowService: DocumentWorkflowService

  // Cache for workflow definitions
  private definitionsCache: Map<string, WorkflowDefinition> = new Map()
  private cacheExpiry: number = 300000 // 5 minutes

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService,
    dmsService: DMSService,
    documentWorkflowService: DocumentWorkflowService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
    this.dmsService = dmsService
    this.documentWorkflowService = documentWorkflowService
  }

  // ============================================================================
  // WORKFLOW DEFINITION MANAGEMENT
  // ============================================================================

  /**
   * Create a new workflow definition
   */
  async createWorkflowDefinition(
    user: TokenPayload,
    definition: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>
  ): Promise<WorkflowDefinition> {
    // Check if user has admin access
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only administrators can create workflow definitions')
    }

    // Validate the workflow definition
    this.validateWorkflowDefinition(definition)

    const workflowId = randomUUID()
    const now = new Date().toISOString()

    const workflowDefinition: WorkflowDefinition = {
      ...definition,
      id: workflowId,
      createdAt: now,
      createdBy: user.upn,
      updatedAt: now,
    }

    // Store in SharePoint list
    await this.storeWorkflowDefinition(workflowDefinition)

    // Clear cache
    this.definitionsCache.clear()

    // Audit
    await this.auditService.createAuditEvent(
      'workflow.definition.created',
      user.upn,
      {
        workflowId,
        name: definition.name,
        category: definition.category,
      },
      `workflow_def_${workflowId}`,
      'unite-workflows'
    )

    return workflowDefinition
  }

  /**
   * Get a workflow definition by ID
   */
  async getWorkflowDefinition(workflowId: string): Promise<WorkflowDefinition | null> {
    // Check cache first
    const cached = this.definitionsCache.get(workflowId)
    if (cached) {
      return cached
    }

    // Load from SharePoint
    const definition = await this.loadWorkflowDefinition(workflowId)
    if (definition) {
      this.definitionsCache.set(workflowId, definition)
    }

    return definition
  }

  /**
   * Find workflow definitions by assignment rules
   */
  async findMatchingWorkflows(
    documentType?: string,
    category?: string,
    committee?: string,
    tags?: string[],
    customFields?: Record<string, any>
  ): Promise<WorkflowDefinition[]> {
    // Load all active workflow definitions
    const allDefinitions = await this.loadAllWorkflowDefinitions()

    // Filter and score by assignment rules
    const matches = allDefinitions
      .filter(def => def.isActive)
      .map(def => ({
        definition: def,
        score: this.scoreWorkflowMatch(def, documentType, category, committee, tags, customFields),
      }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score)

    return matches.map(m => m.definition)
  }

  // ============================================================================
  // WORKFLOW INSTANCE MANAGEMENT
  // ============================================================================

  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    user: TokenPayload,
    workflowDefinitionId: string,
    initialFieldValues: Record<string, any>,
    docStableId?: string,
    assignedCommittee?: string
  ): Promise<WorkflowInstance> {
    // Load workflow definition
    const definition = await this.getWorkflowDefinition(workflowDefinitionId)
    if (!definition) {
      throw new Error('Workflow definition not found')
    }

    // Check access
    if (!this.canUserStartWorkflow(user, definition)) {
      throw new Error('User does not have permission to start this workflow')
    }

    // Find initial state
    const initialState = definition.states.find(s => s.isInitial)
    if (!initialState) {
      throw new Error('Workflow has no initial state')
    }

    // Validate required fields
    this.validateFieldValues(definition, initialState.id, initialFieldValues)

    const instanceId = randomUUID()
    const now = new Date().toISOString()

    const instance: WorkflowInstance = {
      id: instanceId,
      workflowDefinitionId: definition.id,
      workflowVersion: definition.version,
      currentState: initialState.id,
      stateEnteredAt: now,
      docStableId,
      fieldValues: initialFieldValues,
      assignedCommittee,
      history: [
        {
          id: randomUUID(),
          timestamp: now,
          actor: user.upn,
          action: 'transition',
          toState: initialState.id,
          comment: 'Workflow started',
          metadata: {},
        },
      ],
      status: 'active',
      startedAt: now,
      startedBy: user.upn,
      updatedAt: now,
    }

    // Execute onEnter actions for initial state
    if (initialState.onEnter) {
      await this.executeStateActions(instance, definition, initialState.onEnter, user)
    }

    // Store instance in Vercel KV
    await this.storeWorkflowInstance(instance)

    // Audit
    await this.auditService.createAuditEvent(
      'workflow.instance.started',
      user.upn,
      {
        instanceId,
        workflowId: definition.id,
        workflowName: definition.name,
        initialState: initialState.id,
        docStableId,
      },
      `workflow_instance_${instanceId}`,
      definition.settings.siteCollection || 'unite-workflows'
    )

    return instance
  }

  /**
   * Execute a workflow transition
   */
  async executeTransition(
    user: TokenPayload,
    instanceId: string,
    transitionId: string,
    comment?: string,
    attachments?: string[]
  ): Promise<WorkflowInstance> {
    // Load instance and definition
    const instance = await this.getWorkflowInstance(instanceId)
    if (!instance) {
      throw new Error('Workflow instance not found')
    }

    if (instance.status !== 'active') {
      throw new Error(`Cannot transition workflow in ${instance.status} state`)
    }

    const definition = await this.getWorkflowDefinition(instance.workflowDefinitionId)
    if (!definition) {
      throw new Error('Workflow definition not found')
    }

    // Find the transition
    const transition = definition.transitions.find(
      t => t.id === transitionId && t.from === instance.currentState
    )
    if (!transition) {
      throw new Error('Invalid transition for current state')
    }

    // Validate user permissions for this transition
    if (!(await this.canUserExecuteTransition(user, instance, definition, transition))) {
      throw new Error('User does not have permission to execute this transition')
    }

    // Validate conditions
    if (!(await this.validateTransitionConditions(instance, definition, transition, user))) {
      throw new Error('Transition conditions not met')
    }

    // Check required comment/attachments
    if (transition.requiresComment && !comment) {
      throw new Error('Comment is required for this transition')
    }
    if (transition.requiresAttachments && (!attachments || attachments.length < (transition.minAttachments || 1))) {
      throw new Error(`At least ${transition.minAttachments || 1} attachment(s) required`)
    }

    // Check if voting is required
    if (transition.requiresVote) {
      // Voting handled separately via castVote and checkVoteStatus
      throw new Error('This transition requires a vote. Use the voting endpoints.')
    }

    // Execute the transition
    const fromState = definition.states.find(s => s.id === transition.from)!
    const toState = definition.states.find(s => s.id === transition.to)!

    // Execute onExit actions for current state
    if (fromState.onExit) {
      await this.executeStateActions(instance, definition, fromState.onExit, user)
    }

    // Execute transition actions
    if (transition.actions) {
      await this.executeTransitionActions(instance, definition, transition.actions, user)
    }

    // Update instance state
    const now = new Date().toISOString()
    instance.currentState = toState.id
    instance.stateEnteredAt = now
    instance.updatedAt = now

    // Add history entry
    instance.history.push({
      id: randomUUID(),
      timestamp: now,
      actor: user.upn,
      action: 'transition',
      fromState: fromState.id,
      toState: toState.id,
      transitionId: transition.id,
      comment,
      metadata: { attachments },
    })

    // Check if this is a final state
    if (toState.isFinal) {
      instance.status = 'completed'
      instance.completedAt = now
    }

    // Execute onEnter actions for new state
    if (toState.onEnter) {
      await this.executeStateActions(instance, definition, toState.onEnter, user)
    }

    // Store updated instance
    await this.storeWorkflowInstance(instance)

    // Audit
    await this.auditService.createAuditEvent(
      'workflow.instance.transitioned',
      user.upn,
      {
        instanceId,
        workflowId: definition.id,
        fromState: fromState.id,
        toState: toState.id,
        transitionLabel: transition.label,
        comment,
      },
      `workflow_transition_${instanceId}_${Date.now()}`,
      definition.settings.siteCollection || 'unite-workflows'
    )

    return instance
  }

  /**
   * Update workflow instance field values
   */
  async updateFieldValues(
    user: TokenPayload,
    instanceId: string,
    fieldUpdates: Record<string, any>
  ): Promise<WorkflowInstance> {
    // Load instance and definition
    const instance = await this.getWorkflowInstance(instanceId)
    if (!instance) {
      throw new Error('Workflow instance not found')
    }

    const definition = await this.getWorkflowDefinition(instance.workflowDefinitionId)
    if (!definition) {
      throw new Error('Workflow definition not found')
    }

    // Check if user can update fields
    if (!(await this.canUserUpdateFields(user, instance, definition))) {
      throw new Error('User does not have permission to update fields')
    }

    const currentState = definition.states.find(s => s.id === instance.currentState)!
    const now = new Date().toISOString()

    // Validate and update each field
    for (const [fieldName, newValue] of Object.entries(fieldUpdates)) {
      const fieldDef = definition.fields.find(f => f.name === fieldName)
      if (!fieldDef) {
        throw new Error(`Unknown field: ${fieldName}`)
      }

      // Check if field is editable in current state
      if (fieldDef.editableInStates && !fieldDef.editableInStates.includes(currentState.id)) {
        throw new Error(`Field ${fieldName} is not editable in state ${currentState.label}`)
      }

      // Validate field value
      this.validateFieldValue(fieldDef, newValue)

      // Add history entry
      instance.history.push({
        id: randomUUID(),
        timestamp: now,
        actor: user.upn,
        action: 'fieldUpdate',
        fieldName,
        oldValue: instance.fieldValues[fieldName],
        newValue,
      })

      // Update value
      instance.fieldValues[fieldName] = newValue
    }

    instance.updatedAt = now

    // Store updated instance
    await this.storeWorkflowInstance(instance)

    return instance
  }

  /**
   * Get workflow instance by ID
   */
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance | null> {
    try {
      const instance = await kv.get<WorkflowInstance>(`workflow_instance:${instanceId}`)
      return instance
    } catch (error) {
      console.error('Error loading workflow instance:', error)
      return null
    }
  }

  /**
   * Get all instances for a workflow definition
   */
  async getWorkflowInstances(
    workflowDefinitionId: string,
    status?: 'active' | 'completed' | 'cancelled'
  ): Promise<WorkflowInstance[]> {
    try {
      // Get all instance keys for this workflow
      const pattern = `workflow_instance:*`
      const keys = await kv.keys(pattern)

      // Load all instances
      const instances: WorkflowInstance[] = []
      for (const key of keys) {
        const instance = await kv.get<WorkflowInstance>(key)
        if (instance && instance.workflowDefinitionId === workflowDefinitionId) {
          if (!status || instance.status === status) {
            instances.push(instance)
          }
        }
      }

      // Sort by most recent first
      return instances.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    } catch (error) {
      console.error('Error loading workflow instances:', error)
      return []
    }
  }

  // ============================================================================
  // VOTING SUPPORT
  // ============================================================================

  /**
   * Cast a vote on a transition
   */
  async castVote(
    user: TokenPayload,
    instanceId: string,
    transitionId: string,
    vote: 'for' | 'against' | 'abstain',
    comment?: string
  ): Promise<WorkflowVote> {
    const instance = await this.getWorkflowInstance(instanceId)
    if (!instance) {
      throw new Error('Workflow instance not found')
    }

    const definition = await this.getWorkflowDefinition(instance.workflowDefinitionId)
    if (!definition) {
      throw new Error('Workflow definition not found')
    }

    const transition = definition.transitions.find(t => t.id === transitionId)
    if (!transition || !transition.requiresVote) {
      throw new Error('This transition does not require voting')
    }

    // Load or create vote record
    let voteRecord = await kv.get<WorkflowVote>(`workflow_vote:${instanceId}:${transitionId}`)
    if (!voteRecord) {
      voteRecord = {
        instanceId,
        transitionId,
        voteType: transition.voteType || 'simple-majority',
        votes: [],
        requiredVotes: await this.calculateRequiredVotes(instance, definition, transition),
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        status: 'pending',
      }
    }

    // Check if user already voted
    const existingVoteIndex = voteRecord.votes.findIndex(v => v.userId === user.oid)
    if (existingVoteIndex >= 0) {
      // Update existing vote
      const oldVote = voteRecord.votes[existingVoteIndex].vote
      voteRecord.votes[existingVoteIndex] = {
        userId: user.oid,
        vote,
        comment,
        timestamp: new Date().toISOString(),
      }

      // Update counts
      if (oldVote === 'for') voteRecord.votesFor--
      if (oldVote === 'against') voteRecord.votesAgainst--
      if (oldVote === 'abstain') voteRecord.votesAbstain--
    } else {
      // Add new vote
      voteRecord.votes.push({
        userId: user.oid,
        vote,
        comment,
        timestamp: new Date().toISOString(),
      })
    }

    // Update counts
    if (vote === 'for') voteRecord.votesFor++
    if (vote === 'against') voteRecord.votesAgainst++
    if (vote === 'abstain') voteRecord.votesAbstain++

    // Check if vote passed
    const totalVotes = voteRecord.votesFor + voteRecord.votesAgainst + voteRecord.votesAbstain
    if (this.checkVotePassed(voteRecord, totalVotes)) {
      voteRecord.status = 'passed'
      voteRecord.closedAt = new Date().toISOString()

      // Automatically execute transition if vote passed
      await this.executeTransition(user, instanceId, transitionId, 'Vote passed')
    } else if (totalVotes >= voteRecord.requiredVotes && voteRecord.votesAgainst > voteRecord.votesFor) {
      voteRecord.status = 'failed'
      voteRecord.closedAt = new Date().toISOString()
    }

    // Store vote record
    await kv.set(`workflow_vote:${instanceId}:${transitionId}`, voteRecord, { ex: 7776000 }) // 90 days

    // Add to instance history
    instance.history.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      actor: user.upn,
      action: 'vote',
      voteResult: vote,
      comment,
      metadata: { transitionId, voteStatus: voteRecord.status },
    })
    await this.storeWorkflowInstance(instance)

    return voteRecord
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  private validateWorkflowDefinition(definition: Partial<WorkflowDefinition>): void {
    if (!definition.name || definition.name.trim().length === 0) {
      throw new Error('Workflow name is required')
    }

    if (!definition.states || definition.states.length === 0) {
      throw new Error('Workflow must have at least one state')
    }

    const initialStates = definition.states.filter(s => s.isInitial)
    if (initialStates.length !== 1) {
      throw new Error('Workflow must have exactly one initial state')
    }

    const finalStates = definition.states.filter(s => s.isFinal)
    if (finalStates.length === 0) {
      throw new Error('Workflow must have at least one final state')
    }

    // Validate transitions reference valid states
    if (definition.transitions) {
      for (const transition of definition.transitions) {
        const fromState = definition.states.find(s => s.id === transition.from)
        const toState = definition.states.find(s => s.id === transition.to)

        if (!fromState) {
          throw new Error(`Transition references unknown state: ${transition.from}`)
        }
        if (!toState) {
          throw new Error(`Transition references unknown state: ${transition.to}`)
        }
      }
    }
  }

  private validateFieldValues(
    definition: WorkflowDefinition,
    stateId: string,
    values: Record<string, any>
  ): void {
    for (const field of definition.fields) {
      // Check if field is required in this state
      const isRequired =
        field.required ||
        (field.requiredInStates && field.requiredInStates.includes(stateId))

      if (isRequired && (values[field.name] === undefined || values[field.name] === null)) {
        throw new Error(`Required field missing: ${field.label}`)
      }

      if (values[field.name] !== undefined && values[field.name] !== null) {
        this.validateFieldValue(field, values[field.name])
      }
    }
  }

  private validateFieldValue(field: any, value: any): void {
    // Type validation
    switch (field.type) {
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`${field.label} must be a number`)
        }
        if (field.validation?.min !== undefined && value < field.validation.min) {
          throw new Error(`${field.label} must be at least ${field.validation.min}`)
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          throw new Error(`${field.label} must be at most ${field.validation.max}`)
        }
        break

      case 'text':
        if (typeof value !== 'string') {
          throw new Error(`${field.label} must be a string`)
        }
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern)
          if (!regex.test(value)) {
            throw new Error(`${field.label} format is invalid`)
          }
        }
        break

      case 'select':
        if (field.validation?.options && !field.validation.options.includes(value)) {
          throw new Error(`${field.label} must be one of: ${field.validation.options.join(', ')}`)
        }
        break
    }
  }

  private async validateTransitionConditions(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    transition: WorkflowTransition,
    user: TokenPayload
  ): Promise<boolean> {
    if (!transition.conditions) {
      return true
    }

    for (const condition of transition.conditions) {
      if (!(await this.evaluateCondition(condition, instance, definition, user))) {
        return false
      }
    }

    return true
  }

  private async evaluateCondition(
    condition: WorkflowCondition,
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    user: TokenPayload
  ): Promise<boolean> {
    switch (condition.type) {
      case 'field':
        const fieldValue = instance.fieldValues[condition.fieldName!]
        return this.evaluateFieldCondition(condition.operator!, fieldValue, condition.value)

      case 'role':
        if (condition.userMustHaveRole) {
          const userPermissions = await this.accessControlService.getUserPermissions(user)
          // Simplified role check - would need proper role system
          return true // Placeholder
        }
        return true

      case 'time':
        const timeInState = Date.now() - new Date(instance.stateEnteredAt).getTime()
        const hoursInState = timeInState / (1000 * 60 * 60)

        if (condition.minimumTimeInState && hoursInState < condition.minimumTimeInState) {
          return false
        }
        if (condition.maximumTimeInState && hoursInState > condition.maximumTimeInState) {
          return false
        }
        return true

      default:
        return true
    }
  }

  private evaluateFieldCondition(operator: string, fieldValue: any, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue
      case 'notEquals':
        return fieldValue !== conditionValue
      case 'greaterThan':
        return fieldValue > conditionValue
      case 'lessThan':
        return fieldValue < conditionValue
      case 'contains':
        return String(fieldValue).includes(conditionValue)
      case 'isEmpty':
        return !fieldValue
      case 'isNotEmpty':
        return !!fieldValue
      default:
        return true
    }
  }

  // ============================================================================
  // ACTION EXECUTORS
  // ============================================================================

  private async executeStateActions(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    actions: StateAction[],
    user: TokenPayload
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'notify':
            // Placeholder for notification system
            console.log('Notification:', action.notificationTemplate)
            break

          case 'assign':
            if (action.assignToUser) {
              instance.assignedTo = action.assignToUser
            }
            if (action.assignToCommittee) {
              instance.assignedCommittee = action.assignToCommittee
            }
            break

          case 'updateField':
            if (action.fieldName && action.fieldValue !== undefined) {
              instance.fieldValues[action.fieldName] = action.fieldValue
            }
            break

          case 'webhook':
            // Placeholder for webhook calls
            console.log('Webhook:', action.webhookUrl)
            break
        }
      } catch (error) {
        console.error('Error executing state action:', error)
        // Continue with other actions even if one fails
      }
    }
  }

  private async executeTransitionActions(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    actions: TransitionAction[],
    user: TokenPayload
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'audit':
            await this.auditService.createAuditEvent(
              'workflow.custom_action',
              user.upn,
              { message: action.auditMessage, instanceId: instance.id },
              `workflow_action_${instance.id}_${Date.now()}`,
              definition.settings.siteCollection || 'unite-workflows'
            )
            break

          case 'notify':
            // Placeholder for notification
            console.log('Transition notification:', action.notificationMessage)
            break

          case 'document':
            if (action.documentStateChange && instance.docStableId) {
              await this.dmsService.updateDocumentState(
                instance.docStableId,
                action.documentStateChange,
                user.upn
              )
            }
            break
        }
      } catch (error) {
        console.error('Error executing transition action:', error)
      }
    }
  }

  // ============================================================================
  // PERMISSION CHECKS
  // ============================================================================

  private canUserStartWorkflow(user: TokenPayload, definition: WorkflowDefinition): boolean {
    // Check if user's access level is allowed
    // Simplified - would integrate with proper access control
    return true
  }

  private async canUserExecuteTransition(
    user: TokenPayload,
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    transition: WorkflowTransition
  ): Promise<boolean> {
    // Check required roles
    if (transition.requiredRoles && transition.requiredRoles.length > 0) {
      // Would check against user's roles
      // Placeholder for now
    }

    // Check required access level
    if (transition.requiredAccessLevel) {
      const userPermissions = await this.accessControlService.getUserPermissions(user)
      // Would compare access levels properly
    }

    return true
  }

  private async canUserUpdateFields(
    user: TokenPayload,
    instance: WorkflowInstance,
    definition: WorkflowDefinition
  ): Promise<boolean> {
    // Simplified permission check
    return true
  }

  // ============================================================================
  // VOTING HELPERS
  // ============================================================================

  private async calculateRequiredVotes(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    transition: WorkflowTransition
  ): Promise<number> {
    // Would calculate based on committee size or role membership
    // Placeholder: require 3 votes
    return 3
  }

  private checkVotePassed(voteRecord: WorkflowVote, totalVotes: number): boolean {
    if (totalVotes < voteRecord.requiredVotes) {
      return false
    }

    switch (voteRecord.voteType) {
      case 'simple-majority':
        return voteRecord.votesFor > voteRecord.votesAgainst
      case 'two-thirds':
        return voteRecord.votesFor >= (totalVotes * 2) / 3
      case 'unanimous':
        return voteRecord.votesFor === totalVotes && voteRecord.votesAgainst === 0
      default:
        return false
    }
  }

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================

  private async storeWorkflowDefinition(definition: WorkflowDefinition): Promise<void> {
    // Store in SharePoint list (would be implemented properly)
    // For now, also store in KV for quick access
    await kv.set(`workflow_definition:${definition.id}`, definition, { ex: 31536000 }) // 1 year
  }

  private async loadWorkflowDefinition(workflowId: string): Promise<WorkflowDefinition | null> {
    try {
      const definition = await kv.get<WorkflowDefinition>(`workflow_definition:${workflowId}`)
      return definition
    } catch (error) {
      console.error('Error loading workflow definition:', error)
      return null
    }
  }

  private async loadAllWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
    try {
      const keys = await kv.keys('workflow_definition:*')
      const definitions: WorkflowDefinition[] = []

      for (const key of keys) {
        const def = await kv.get<WorkflowDefinition>(key)
        if (def) {
          definitions.push(def)
        }
      }

      return definitions
    } catch (error) {
      console.error('Error loading workflow definitions:', error)
      return []
    }
  }

  private async storeWorkflowInstance(instance: WorkflowInstance): Promise<void> {
    await kv.set(`workflow_instance:${instance.id}`, instance, { ex: 7776000 }) // 90 days
  }

  private scoreWorkflowMatch(
    definition: WorkflowDefinition,
    documentType?: string,
    category?: string,
    committee?: string,
    tags?: string[],
    customFields?: Record<string, any>
  ): number {
    if (!definition.assignmentRules || definition.assignmentRules.length === 0) {
      return 0
    }

    let maxScore = 0

    for (const rule of definition.assignmentRules) {
      let score = rule.priority || 1

      // Check document type
      if (rule.documentType && documentType) {
        if (rule.documentType.includes(documentType)) {
          score += 10
        } else {
          continue // Rule doesn't match, skip
        }
      }

      // Check category
      if (rule.documentCategory && category) {
        if (rule.documentCategory.includes(category)) {
          score += 5
        } else {
          continue
        }
      }

      // Check committee
      if (rule.committee && committee) {
        if (rule.committee.includes(committee)) {
          score += 5
        } else {
          continue
        }
      }

      // Check tags
      if (rule.tags && tags) {
        const matchedTags = tags.filter(t => rule.tags!.includes(t))
        if (matchedTags.length > 0) {
          score += matchedTags.length
        }
      }

      maxScore = Math.max(maxScore, score)
    }

    return maxScore
  }
}

export * from './definitions'
