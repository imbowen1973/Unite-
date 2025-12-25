// Workflow Engine API for Unite Platform
// RESTful endpoints for managing configurable workflows

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DMSService } from '@/lib/dms'
import { DocumentWorkflowService } from '@/lib/workflow'
import { WorkflowEngineService } from '@/lib/workflow-engine'
import { WorkflowRouterService } from '@/lib/workflow-engine/router'

// Initialize services
const sharepointService = new SharePointService({
  tenantId: process.env.MICROSOFT_TENANT_ID!,
  siteId: process.env.SHAREPOINT_SITE_ID!,
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
})

const auditService = new AuditService(sharepointService)
const accessControlService = new AccessControlService(sharepointService, auditService)
const dmsService = new DMSService(sharepointService, auditService, accessControlService)
const documentWorkflowService = new DocumentWorkflowService(
  sharepointService,
  auditService,
  accessControlService,
  dmsService
)

const workflowEngine = new WorkflowEngineService(
  sharepointService,
  auditService,
  accessControlService,
  dmsService,
  documentWorkflowService
)

const workflowRouter = new WorkflowRouterService(workflowEngine)

/**
 * POST /api/workflow-engine
 *
 * Actions:
 * - createDefinition: Create a new workflow definition
 * - startWorkflow: Start a new workflow instance
 * - executeTransition: Execute a state transition
 * - updateFields: Update workflow instance fields
 * - castVote: Cast a vote on a transition
 * - getDefinition: Get a workflow definition
 * - getInstance: Get a workflow instance
 * - listInstances: List workflow instances
 * - suggestWorkflows: Get workflow suggestions for a context
 * - routeDocument: Automatically route a document to a workflow
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await verifyToken(token)

    // Parse request body
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ================================================================
      // WORKFLOW DEFINITION MANAGEMENT
      // ================================================================

      case 'createDefinition': {
        const { definition } = body

        if (!definition) {
          return NextResponse.json({ error: 'definition is required' }, { status: 400 })
        }

        const workflowDef = await workflowEngine.createWorkflowDefinition(user, definition)

        return NextResponse.json({
          success: true,
          workflow: workflowDef,
          message: `Workflow "${workflowDef.name}" created successfully`,
        })
      }

      case 'getDefinition': {
        const { workflowId } = body

        if (!workflowId) {
          return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
        }

        const definition = await workflowEngine.getWorkflowDefinition(workflowId)

        if (!definition) {
          return NextResponse.json({ error: 'Workflow definition not found' }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          definition,
        })
      }

      case 'listDefinitions': {
        const { category, isActive } = body

        // Load all definitions (would add filtering)
        const allDefinitions = await workflowEngine['loadAllWorkflowDefinitions']()

        let filtered = allDefinitions

        if (category) {
          filtered = filtered.filter(d => d.category === category)
        }

        if (isActive !== undefined) {
          filtered = filtered.filter(d => d.isActive === isActive)
        }

        return NextResponse.json({
          success: true,
          definitions: filtered,
          count: filtered.length,
        })
      }

      // ================================================================
      // WORKFLOW INSTANCE MANAGEMENT
      // ================================================================

      case 'startWorkflow': {
        const { workflowDefinitionId, fieldValues, docStableId, assignedCommittee } = body

        if (!workflowDefinitionId) {
          return NextResponse.json({ error: 'workflowDefinitionId is required' }, { status: 400 })
        }

        const instance = await workflowEngine.startWorkflow(
          user,
          workflowDefinitionId,
          fieldValues || {},
          docStableId,
          assignedCommittee
        )

        return NextResponse.json({
          success: true,
          instance,
          message: 'Workflow started successfully',
        })
      }

      case 'getInstance': {
        const { instanceId } = body

        if (!instanceId) {
          return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
        }

        const instance = await workflowEngine.getWorkflowInstance(instanceId)

        if (!instance) {
          return NextResponse.json({ error: 'Workflow instance not found' }, { status: 404 })
        }

        // Get the definition too for context
        const definition = await workflowEngine.getWorkflowDefinition(instance.workflowDefinitionId)

        return NextResponse.json({
          success: true,
          instance,
          definition,
        })
      }

      case 'listInstances': {
        const { workflowDefinitionId, status } = body

        if (!workflowDefinitionId) {
          return NextResponse.json({ error: 'workflowDefinitionId is required' }, { status: 400 })
        }

        const instances = await workflowEngine.getWorkflowInstances(workflowDefinitionId, status)

        return NextResponse.json({
          success: true,
          instances,
          count: instances.length,
        })
      }

      // ================================================================
      // WORKFLOW EXECUTION
      // ================================================================

      case 'executeTransition': {
        const { instanceId, transitionId, comment, attachments } = body

        if (!instanceId || !transitionId) {
          return NextResponse.json(
            { error: 'instanceId and transitionId are required' },
            { status: 400 }
          )
        }

        const updatedInstance = await workflowEngine.executeTransition(
          user,
          instanceId,
          transitionId,
          comment,
          attachments
        )

        // Get current state info
        const definition = await workflowEngine.getWorkflowDefinition(updatedInstance.workflowDefinitionId)
        const currentState = definition?.states.find(s => s.id === updatedInstance.currentState)

        return NextResponse.json({
          success: true,
          instance: updatedInstance,
          currentState: currentState?.label,
          message: `Transitioned to ${currentState?.label}`,
        })
      }

      case 'updateFields': {
        const { instanceId, fieldUpdates } = body

        if (!instanceId || !fieldUpdates) {
          return NextResponse.json(
            { error: 'instanceId and fieldUpdates are required' },
            { status: 400 }
          )
        }

        const updatedInstance = await workflowEngine.updateFieldValues(user, instanceId, fieldUpdates)

        return NextResponse.json({
          success: true,
          instance: updatedInstance,
          message: 'Fields updated successfully',
        })
      }

      case 'getAvailableTransitions': {
        const { instanceId } = body

        if (!instanceId) {
          return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
        }

        const instance = await workflowEngine.getWorkflowInstance(instanceId)
        if (!instance) {
          return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
        }

        const definition = await workflowEngine.getWorkflowDefinition(instance.workflowDefinitionId)
        if (!definition) {
          return NextResponse.json({ error: 'Definition not found' }, { status: 404 })
        }

        // Find available transitions from current state
        const availableTransitions = definition.transitions.filter(
          t => t.from === instance.currentState
        )

        return NextResponse.json({
          success: true,
          transitions: availableTransitions,
          currentState: instance.currentState,
        })
      }

      // ================================================================
      // VOTING
      // ================================================================

      case 'castVote': {
        const { instanceId, transitionId, vote, comment } = body

        if (!instanceId || !transitionId || !vote) {
          return NextResponse.json(
            { error: 'instanceId, transitionId, and vote are required' },
            { status: 400 }
          )
        }

        if (!['for', 'against', 'abstain'].includes(vote)) {
          return NextResponse.json(
            { error: 'vote must be "for", "against", or "abstain"' },
            { status: 400 }
          )
        }

        const voteRecord = await workflowEngine.castVote(user, instanceId, transitionId, vote, comment)

        return NextResponse.json({
          success: true,
          vote: voteRecord,
          message: `Vote cast: ${vote}`,
        })
      }

      // ================================================================
      // WORKFLOW ROUTING
      // ================================================================

      case 'suggestWorkflows': {
        const { context } = body

        if (!context) {
          return NextResponse.json({ error: 'context is required' }, { status: 400 })
        }

        const suggestions = await workflowRouter.suggestWorkflows(context)

        return NextResponse.json({
          success: true,
          suggestions,
          count: suggestions.length,
        })
      }

      case 'routeDocument': {
        const { docStableId, documentType, category, committee, tags } = body

        if (!docStableId || !documentType) {
          return NextResponse.json(
            { error: 'docStableId and documentType are required' },
            { status: 400 }
          )
        }

        const instance = await workflowRouter.routeDocument(
          user,
          docStableId,
          documentType,
          category,
          committee,
          tags
        )

        if (!instance) {
          return NextResponse.json({
            success: false,
            message: 'No matching workflow found for this document',
          })
        }

        return NextResponse.json({
          success: true,
          instance,
          message: 'Document routed to workflow successfully',
        })
      }

      case 'routeToCommittee': {
        const { committee, documentType, docStableId, customFields } = body

        if (!committee || !documentType) {
          return NextResponse.json(
            { error: 'committee and documentType are required' },
            { status: 400 }
          )
        }

        const instance = await workflowRouter.routeToCommittee(
          user,
          committee,
          documentType,
          docStableId,
          customFields
        )

        if (!instance) {
          return NextResponse.json({
            success: false,
            message: 'No matching workflow found for this committee',
          })
        }

        return NextResponse.json({
          success: true,
          instance,
          message: `Workflow started for committee: ${committee}`,
        })
      }

      // ================================================================
      // ERROR: UNKNOWN ACTION
      // ================================================================

      default:
        return NextResponse.json({ error: 'Unknown action: ' + action }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Workflow engine API error:', error)

    // Return user-friendly error message
    return NextResponse.json(
      {
        error: error.message || 'Request processing failed',
        action: (await request.json()).action,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workflow-engine?instanceId=xxx
 * Get workflow instance details
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    await verifyToken(token)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const instanceId = searchParams.get('instanceId')
    const workflowId = searchParams.get('workflowId')

    if (instanceId) {
      const instance = await workflowEngine.getWorkflowInstance(instanceId)
      if (!instance) {
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
      }

      const definition = await workflowEngine.getWorkflowDefinition(instance.workflowDefinitionId)

      return NextResponse.json({
        success: true,
        instance,
        definition,
      })
    }

    if (workflowId) {
      const definition = await workflowEngine.getWorkflowDefinition(workflowId)
      if (!definition) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        definition,
      })
    }

    return NextResponse.json({ error: 'instanceId or workflowId is required' }, { status: 400 })
  } catch (error: any) {
    console.error('Workflow engine GET error:', error)
    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
  }
}
