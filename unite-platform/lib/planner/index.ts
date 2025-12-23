// Microsoft Planner Integration Service for Unite Platform
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

export interface PlannerTask {
  id: string
  title: string
  description: string
  assignedTo: string[] // User IDs
  dueDate?: string
  status: 'notStarted' | 'inProgress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  planId: string
  bucketId: string
  percentComplete: number
  completionCriteria?: string
  createdAt: string
  completedAt?: string
}

export interface PlannerPlan {
  id: string
  title: string
  description: string
  owner: string // User ID
  createdDateTime: string
}

export interface PlannerBucket {
  id: string
  name: string
  planId: string
  orderHint: string
}

export class PlannerIntegrationService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  // Create a new Planner task from meeting action
  async createTaskFromAction(
    user: TokenPayload,
    title: string,
    description: string,
    assignedTo: string[],
    dueDate?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    planId?: string,
    completionCriteria?: string
  ): Promise<PlannerTask> {
    // If no plan ID is provided, use a default plan or create one
    if (!planId) {
      planId = await this.getDefaultPlanId(user)
    }

    // Create a default bucket if needed
    const bucketId = await this.getDefaultBucketId(planId)

    const taskId = this.generateId()
    const task: PlannerTask = {
      id: taskId,
      title,
      description,
      assignedTo,
      dueDate,
      status: 'notStarted',
      priority,
      planId,
      bucketId,
      percentComplete: 0,
      completionCriteria,
      createdAt: new Date().toISOString()
    }

    // In a real implementation, this would call the Microsoft Graph API to create the task
    // For now, we'll simulate by storing in SharePoint
    await this.sharepointService.addListItem('plannerTasksListId', {
      Id: taskId,
      Title: title,
      Description: description,
      AssignedTo: assignedTo.join(','),
      DueDate: dueDate,
      Status: 'notStarted',
      Priority: priority,
      PlanId: planId,
      BucketId: bucketId,
      PercentComplete: 0,
      CompletionCriteria: completionCriteria,
      CreatedAt: task.createdAt
    })

    // Log the task creation
    await this.auditService.createAuditEvent(
      'planner.task_created',
      user.upn,
      {
        taskId,
        title,
        assignedTo,
        planId,
        createdFrom: 'meeting_action'
      },
      'create_planner_task_' + taskId,
      'unite-planner'
    )

    return task
  }

  // Update a Planner task status
  async updateTaskStatus(
    user: TokenPayload,
    taskId: string,
    status: 'notStarted' | 'inProgress' | 'completed' | 'cancelled',
    percentComplete?: number
  ): Promise<PlannerTask> {
    // In a real implementation, this would call the Microsoft Graph API to update the task
    // For now, we'll update our SharePoint simulation
    
    // Get the current task
    const tasksList = await this.sharepointService.getListItems('plannerTasksListId')
    let taskToUpdate: any = null
    
    for (const item of tasksList) {
      if (item.fields.Id === taskId) {
        taskToUpdate = item
        break
      }
    }

    if (!taskToUpdate) {
      throw new Error('Planner task not found')
    }

    // Update the task
    const updatedFields: any = {
      Status: status,
      UpdatedAt: new Date().toISOString()
    }

    if (percentComplete !== undefined) {
      updatedFields.PercentComplete = percentComplete
    }

    if (status === 'completed' && !taskToUpdate.fields.CompletedAt) {
      updatedFields.CompletedAt = new Date().toISOString()
    }

    await this.sharepointService.updateListItem('plannerTasksListId', taskId, updatedFields)

    // Update our local task object
    taskToUpdate.fields.Status = status
    taskToUpdate.fields.PercentComplete = percentComplete ?? taskToUpdate.fields.PercentComplete
    taskToUpdate.fields.UpdatedAt = updatedFields.UpdatedAt
    if (status === 'completed' && !taskToUpdate.fields.CompletedAt) {
      taskToUpdate.fields.CompletedAt = updatedFields.CompletedAt
    }

    // Log the status update
    await this.auditService.createAuditEvent(
      'planner.task_status_updated',
      user.upn,
      {
        taskId,
        status,
        percentComplete,
        updatedBy: user.oid
      },
      'update_planner_task_' + taskId,
      'unite-planner'
    )

    return {
      id: taskToUpdate.fields.Id,
      title: taskToUpdate.fields.Title,
      description: taskToUpdate.fields.Description,
      assignedTo: taskToUpdate.fields.AssignedTo.split(','),
      dueDate: taskToUpdate.fields.DueDate,
      status: taskToUpdate.fields.Status,
      priority: taskToUpdate.fields.Priority,
      planId: taskToUpdate.fields.PlanId,
      bucketId: taskToUpdate.fields.BucketId,
      percentComplete: taskToUpdate.fields.PercentComplete,
      completionCriteria: taskToUpdate.fields.CompletionCriteria,
      createdAt: taskToUpdate.fields.CreatedAt,
      completedAt: taskToUpdate.fields.CompletedAt
    }
  }

  // Get tasks assigned to a user
  async getTasksForUser(user: TokenPayload, userId: string): Promise<PlannerTask[]> {
    // In a real implementation, this would call the Microsoft Graph API
    // For now, we'll query our SharePoint simulation
    
    const tasksList = await this.sharepointService.getListItems('plannerTasksListId')
    const userTasks: PlannerTask[] = []

    for (const item of tasksList) {
      const assignedUsers = item.fields.AssignedTo.split(',')
      if (assignedUsers.includes(userId)) {
        userTasks.push({
          id: item.fields.Id,
          title: item.fields.Title,
          description: item.fields.Description,
          assignedTo: assignedUsers,
          dueDate: item.fields.DueDate,
          status: item.fields.Status,
          priority: item.fields.Priority,
          planId: item.fields.PlanId,
          bucketId: item.fields.BucketId,
          percentComplete: item.fields.PercentComplete,
          completionCriteria: item.fields.CompletionCriteria,
          createdAt: item.fields.CreatedAt,
          completedAt: item.fields.CompletedAt
        })
      }
    }

    return userTasks
  }

  // Get tasks for a specific plan
  async getTasksForPlan(user: TokenPayload, planId: string): Promise<PlannerTask[]> {
    // In a real implementation, this would call the Microsoft Graph API
    // For now, we'll query our SharePoint simulation
    
    const tasksList = await this.sharepointService.getListItems('plannerTasksListId')
    const planTasks: PlannerTask[] = []

    for (const item of tasksList) {
      if (item.fields.PlanId === planId) {
        planTasks.push({
          id: item.fields.Id,
          title: item.fields.Title,
          description: item.fields.Description,
          assignedTo: item.fields.AssignedTo.split(','),
          dueDate: item.fields.DueDate,
          status: item.fields.Status,
          priority: item.fields.Priority,
          planId: item.fields.PlanId,
          bucketId: item.fields.BucketId,
          percentComplete: item.fields.PercentComplete,
          completionCriteria: item.fields.CompletionCriteria,
          createdAt: item.fields.CreatedAt,
          completedAt: item.fields.CompletedAt
        })
      }
    }

    return planTasks
  }

  // Create a Planner plan
  async createPlan(
    user: TokenPayload,
    title: string,
    description: string
  ): Promise<PlannerPlan> {
    const planId = this.generateId()
    const plan: PlannerPlan = {
      id: planId,
      title,
      description,
      owner: user.oid,
      createdDateTime: new Date().toISOString()
    }

    // In a real implementation, this would call the Microsoft Graph API
    // For now, we'll simulate by storing in SharePoint
    await this.sharepointService.addListItem('plannerPlansListId', {
      Id: planId,
      Title: title,
      Description: description,
      Owner: user.oid,
      CreatedDateTime: plan.createdDateTime
    })

    // Create a default bucket for the plan
    await this.createBucket(user, 'Tasks', planId)

    // Log the plan creation
    await this.auditService.createAuditEvent(
      'planner.plan_created',
      user.upn,
      {
        planId,
        title,
        description
      },
      'create_planner_plan_' + planId,
      'unite-planner'
    )

    return plan
  }

  // Create a Planner bucket
  async createBucket(
    user: TokenPayload,
    name: string,
    planId: string
  ): Promise<PlannerBucket> {
    const bucketId = this.generateId()
    const bucket: PlannerBucket = {
      id: bucketId,
      name,
      planId,
      orderHint: ' !'
    }

    // In a real implementation, this would call the Microsoft Graph API
    // For now, we'll simulate by storing in SharePoint
    await this.sharepointService.addListItem('plannerBucketsListId', {
      Id: bucketId,
      Name: name,
      PlanId: planId,
      OrderHint: bucket.orderHint
    })

    // Log the bucket creation
    await this.auditService.createAuditEvent(
      'planner.bucket_created',
      user.upn,
      {
        bucketId,
        name,
        planId
      },
      'create_planner_bucket_' + bucketId,
      'unite-planner'
    )

    return bucket
  }

  // Get default plan ID for a user
  private async getDefaultPlanId(user: TokenPayload): Promise<string> {
    // In a real implementation, this would query for the user's default plan
    // For now, we'll create a default plan if one doesn't exist
    const plansList = await this.sharepointService.getListItems('plannerPlansListId')
    
    for (const item of plansList) {
      if (item.fields.Owner === user.oid && item.fields.Title === 'Default Plan') {
        return item.fields.Id
      }
    }

    // Create a default plan
    const defaultPlan = await this.createPlan(user, 'Default Plan', 'Default plan for tasks')
    return defaultPlan.id
  }

  // Get default bucket ID for a plan
  private async getDefaultBucketId(planId: string): Promise<string> {
    // In a real implementation, this would query for the plan's default bucket
    // For now, we'll create a default bucket if one doesn't exist
    const bucketsList = await this.sharepointService.getListItems('plannerBucketsListId')
    
    for (const item of bucketsList) {
      if (item.fields.PlanId === planId && item.fields.Name === 'Tasks') {
        return item.fields.Id
      }
    }

    // Create a default bucket
    const defaultBucket = await this.createBucket({} as TokenPayload, 'Tasks', planId)
    return defaultBucket.id
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }
}
