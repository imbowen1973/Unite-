// Planner API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { PlannerIntegrationService } from '@/lib/planner'

// Initialize services
const sharepointService = new SharePointService({
  tenantUrl: process.env.SHAREPOINT_TENANT_URL || '',
  clientId: process.env.SHAREPOINT_CLIENT_ID || '',
  clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
  siteId: process.env.SHAREPOINT_SITE_ID || ''
})

const auditService = new AuditService(sharepointService)
const plannerService = new PlannerIntegrationService(sharepointService, auditService)

export async function GET(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const user = await verifyToken(token)
    
    // Get parameters from query
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId') || user.oid
    const planId = searchParams.get('planId')
    
    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'getTasksForUser':
        // Get tasks assigned to a specific user
        result = await plannerService.getTasksForUser(user, userId)
        break
        
      case 'getTasksForPlan':
        // Get tasks for a specific plan
        if (!planId) {
          return NextResponse.json({ error: 'planId parameter is required for getTasksForPlan action' }, { status: 400 })
        }
        result = await plannerService.getTasksForPlan(user, planId)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log the access for audit trail
    await auditService.createAuditEvent(
      'planner.accessed',
      user.upn,
      {
        action,
        userId,
        planId,
        taskCount: Array.isArray(result) ? result.length : 1
      },
      'access_planner_' + action + '_' + userId + '_' + Date.now(),
      'unite-planner'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Planner API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const user = await verifyToken(token)
    
    // Parse the request body
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'createTask':
        // Create a new Planner task
        const { title, description, assignedTo, dueDate, priority, planId, completionCriteria } = body
        const task = await plannerService.createTaskFromAction(
          user,
          title,
          description,
          assignedTo || [user.oid],
          dueDate,
          priority || 'medium',
          planId,
          completionCriteria
        )
        return NextResponse.json(task)
        
      case 'updateTaskStatus':
        // Update a task's status
        const { taskId, status, percentComplete } = body
        const updatedTask = await plannerService.updateTaskStatus(
          user,
          taskId,
          status,
          percentComplete
        )
        return NextResponse.json(updatedTask)
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Planner API POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
