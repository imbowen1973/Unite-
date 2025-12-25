// Workflow Router for Unite Platform
// Automatically assigns workflows based on rules

import { TokenPayload } from '@/lib/auth'
import { WorkflowEngineService } from './index'
import { WorkflowDefinition, WorkflowInstance } from './definitions'

export interface WorkflowRouterContext {
  // Document context
  documentType?: string
  documentCategory?: string
  docStableId?: string

  // Team/Committee context
  committee?: string
  team?: string
  department?: string

  // User context
  submittedBy?: string
  assignedTo?: string

  // Tags and metadata
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'critical'
  customFields?: Record<string, any>

  // Additional context
  relatedWorkflows?: string[] // Other workflow instance IDs
  parentWorkflow?: string // Parent workflow instance ID
}

export interface WorkflowSuggestion {
  definition: WorkflowDefinition
  matchScore: number
  matchReasons: string[]
  autoStart: boolean // Should this workflow auto-start?
}

export class WorkflowRouterService {
  private workflowEngine: WorkflowEngineService

  constructor(workflowEngine: WorkflowEngineService) {
    this.workflowEngine = workflowEngine
  }

  /**
   * Find the best matching workflow for a given context
   */
  async suggestWorkflows(context: WorkflowRouterContext): Promise<WorkflowSuggestion[]> {
    // Find all matching workflows
    const matchingDefinitions = await this.workflowEngine.findMatchingWorkflows(
      context.documentType,
      context.documentCategory,
      context.committee,
      context.tags,
      context.customFields
    )

    // Score and rank workflows
    const suggestions: WorkflowSuggestion[] = []

    for (const definition of matchingDefinitions) {
      const { score, reasons, autoStart } = this.scoreWorkflow(definition, context)

      if (score > 0) {
        suggestions.push({
          definition,
          matchScore: score,
          matchReasons: reasons,
          autoStart,
        })
      }
    }

    // Sort by score descending
    return suggestions.sort((a, b) => b.matchScore - a.matchScore)
  }

  /**
   * Automatically start a workflow if rules match
   */
  async autoStartWorkflow(
    user: TokenPayload,
    context: WorkflowRouterContext,
    initialFieldValues: Record<string, any> = {}
  ): Promise<WorkflowInstance | null> {
    // Find best matching workflow
    const suggestions = await this.suggestWorkflows(context)

    if (suggestions.length === 0) {
      return null
    }

    const bestMatch = suggestions[0]

    // Only auto-start if configured to do so
    if (!bestMatch.autoStart) {
      return null
    }

    // Merge context into field values
    const fieldValues = {
      ...initialFieldValues,
      ...this.extractFieldValuesFromContext(context),
    }

    // Start the workflow
    return await this.workflowEngine.startWorkflow(
      user,
      bestMatch.definition.id,
      fieldValues,
      context.docStableId,
      context.committee
    )
  }

  /**
   * Route a document to appropriate workflow
   */
  async routeDocument(
    user: TokenPayload,
    docStableId: string,
    documentType: string,
    category?: string,
    committee?: string,
    tags?: string[]
  ): Promise<WorkflowInstance | null> {
    const context: WorkflowRouterContext = {
      docStableId,
      documentType,
      documentCategory: category,
      committee,
      tags,
      submittedBy: user.upn,
    }

    return await this.autoStartWorkflow(user, context)
  }

  /**
   * Route based on team/committee assignment
   */
  async routeToCommittee(
    user: TokenPayload,
    committee: string,
    documentType: string,
    docStableId?: string,
    customFields?: Record<string, any>
  ): Promise<WorkflowInstance | null> {
    const context: WorkflowRouterContext = {
      committee,
      documentType,
      docStableId,
      customFields,
      submittedBy: user.upn,
    }

    return await this.autoStartWorkflow(user, context)
  }

  /**
   * Get active workflows for a document
   */
  async getDocumentWorkflows(docStableId: string): Promise<WorkflowInstance[]> {
    // This would query all workflow instances filtered by docStableId
    // For now, simplified implementation
    return []
  }

  /**
   * Get active workflows for a committee
   */
  async getCommitteeWorkflows(committee: string, status?: 'active' | 'completed'): Promise<WorkflowInstance[]> {
    // This would query workflow instances filtered by committee
    // Simplified for now
    return []
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private scoreWorkflow(
    definition: WorkflowDefinition,
    context: WorkflowRouterContext
  ): { score: number; reasons: string[]; autoStart: boolean } {
    let score = 0
    const reasons: string[] = []
    let autoStart = false

    if (!definition.assignmentRules || definition.assignmentRules.length === 0) {
      return { score: 0, reasons: [], autoStart: false }
    }

    for (const rule of definition.assignmentRules) {
      let ruleMatches = true
      let ruleScore = rule.priority || 1

      // Check document type
      if (rule.documentType) {
        if (context.documentType && rule.documentType.includes(context.documentType)) {
          ruleScore += 10
          reasons.push(`Matches document type: ${context.documentType}`)
        } else {
          ruleMatches = false
        }
      }

      // Check document category
      if (rule.documentCategory) {
        if (context.documentCategory && rule.documentCategory.includes(context.documentCategory)) {
          ruleScore += 5
          reasons.push(`Matches category: ${context.documentCategory}`)
        } else {
          ruleMatches = false
        }
      }

      // Check committee
      if (rule.committee) {
        if (context.committee && rule.committee.includes(context.committee)) {
          ruleScore += 5
          reasons.push(`Matches committee: ${context.committee}`)
          autoStart = true // Committee rules often auto-start
        } else {
          ruleMatches = false
        }
      }

      // Check tags
      if (rule.tags && context.tags) {
        const matchedTags = context.tags.filter(t => rule.tags!.includes(t))
        if (matchedTags.length > 0) {
          ruleScore += matchedTags.length
          reasons.push(`Matches tags: ${matchedTags.join(', ')}`)
        }
      }

      // Check custom field matches
      if (rule.customFieldMatches && context.customFields) {
        for (const fieldMatch of rule.customFieldMatches) {
          const fieldValue = context.customFields[fieldMatch.fieldName]
          if (this.evaluateFieldMatch(fieldValue, fieldMatch.operator, fieldMatch.value)) {
            ruleScore += 3
            reasons.push(`Custom field match: ${fieldMatch.fieldName}`)
          } else {
            ruleMatches = false
          }
        }
      }

      if (ruleMatches) {
        score = Math.max(score, ruleScore)
      }
    }

    return { score, reasons, autoStart }
  }

  private evaluateFieldMatch(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expected
      case 'contains':
        return String(value).includes(expected)
      case 'startsWith':
        return String(value).startsWith(expected)
      case 'greaterThan':
        return Number(value) > Number(expected)
      case 'lessThan':
        return Number(value) < Number(expected)
      default:
        return false
    }
  }

  private extractFieldValuesFromContext(context: WorkflowRouterContext): Record<string, any> {
    const fieldValues: Record<string, any> = {}

    if (context.documentType) fieldValues.documentType = context.documentType
    if (context.documentCategory) fieldValues.category = context.documentCategory
    if (context.committee) fieldValues.committee = context.committee
    if (context.team) fieldValues.team = context.team
    if (context.priority) fieldValues.priority = context.priority
    if (context.submittedBy) fieldValues.submittedBy = context.submittedBy
    if (context.tags) fieldValues.tags = context.tags

    // Merge custom fields
    if (context.customFields) {
      Object.assign(fieldValues, context.customFields)
    }

    return fieldValues
  }
}
