// Dashboard Service for Unite Platform
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'

export interface DashboardCounts {
  pendingApproval: number
  needingReview: number
  needingRescinding: number
  totalDocuments: number
  totalMeetings: number
  totalUsers: number
  totalLibraries: number
}

export interface DocumentLifecycleItem {
  docStableId: string
  title: string
  state: string
  dueDate?: string
  assignedTo?: string[]
  priority: 'low' | 'medium' | 'high'
}

export interface AssignedTask {
  id: string
  title: string
  description: string
  dueDate: string
  status: 'notStarted' | 'inProgress' | 'completed'
  source: 'planner' | 'meeting' | 'document'
}

export class DashboardService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService
  private documentWorkflowService: DocumentWorkflowService
  private dmsService: DMSService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService,
    documentWorkflowService: DocumentWorkflowService,
    dmsService: DMSService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
    this.documentWorkflowService = documentWorkflowService
    this.dmsService = dmsService
  }

  // Get dashboard counts for admin dashboard
  async getDashboardCounts(): Promise<DashboardCounts> {
    // Get documents by state
    const pendingApprovalDocs = await this.dmsService.getDocumentsByState('PendingApproval')
    const needingReviewDocs = await this.dmsService.getDocumentsByState('Approved') // In a real system, this might be a different state
    const needingRescindingDocs = await this.dmsService.getDocumentsByState('Published') // In a real system, this might be documents marked for review
    
    // Get total documents
    const allDocuments = await this.dmsService.getDocumentsBySiteCollection('unite-docs')
    
    // Get meeting count
    const meetingsList = await this.sharepointService.getListItems('meetingsListId')
    
    // Get user count (would come from Entra ID or SharePoint user list)
    const usersList = await this.sharepointService.getListItems('usersListId')
    
    // Get library count (would come from SharePoint site libraries)
    const librariesList = await this.sharepointService.getListItems('librariesListId')

    return {
      pendingApproval: pendingApprovalDocs.length,
      needingReview: needingReviewDocs.length,
      needingRescinding: needingRescindingDocs.length,
      totalDocuments: allDocuments.length,
      totalMeetings: meetingsList.length,
      totalUsers: usersList.length,
      totalLibraries: librariesList.length
    }
  }

  // Get documents needing attention for lifecycle panel
  async getDocumentsNeedingAttention(): Promise<DocumentLifecycleItem[]> {
    const result: DocumentLifecycleItem[] = []

    // Get documents pending approval
    const pendingApprovalDocs = await this.dmsService.getDocumentsByState('PendingApproval')
    for (const doc of pendingApprovalDocs) {
      result.push({
        docStableId: doc.docStableId,
        title: doc.title,
        state: doc.state,
        priority: 'high'
      })
    }

    // Get documents needing review (in a real system, these would be documents marked for review)
    const reviewDocs = await this.dmsService.getDocumentsByState('Approved')
    for (const doc of reviewDocs) {
      result.push({
        docStableId: doc.docStableId,
        title: doc.title,
        state: doc.state,
        priority: 'medium'
      })
    }

    // Get documents needing rescinding (in a real system, these would be documents marked for rescinding)
    const rescindingDocs = await this.dmsService.getDocumentsByState('Published')
    for (const doc of rescindingDocs) {
      result.push({
        docStableId: doc.docStableId,
        title: doc.title,
        state: doc.state,
        priority: 'medium'
      })
    }

    return result
  }

  // Get assigned tasks for executive dashboard
  async getAssignedTasks(executiveId: string): Promise<AssignedTask[]> {
    // This would integrate with Microsoft Planner in a real implementation
    // For now, we'll return mock data
    return [
      {
        id: 'task-1',
        title: 'Review Q4 Financial Report',
        description: 'Review and approve the Q4 financial report before the board meeting',
        dueDate: '2023-12-30',
        status: 'inProgress',
        source: 'document'
      },
      {
        id: 'task-2',
        title: 'Prepare Standards Committee Meeting',
        description: 'Prepare agenda and supporting documents for the standards committee meeting',
        dueDate: '2023-12-28',
        status: 'notStarted',
        source: 'meeting'
      },
      {
        id: 'task-3',
        title: 'Update Governance Policy',
        description: 'Review and update the governance policy based on new regulations',
        dueDate: '2024-01-15',
        status: 'notStarted',
        source: 'planner'
      }
    ]
  }

  // Create a new site library
  async createSiteLibrary(
    siteCollection: string,
    libraryName: string,
    purpose: string,
    allowedAccessLevels: string[],
    retentionPeriod: number,
    createdBy: string
  ): Promise<string> {
    // Create the site library configuration
    const config = {
      siteCollection,
      libraryName,
      purpose,
      allowedAccessLevels,
      retentionPeriod
    }

    // Create the site library
    const siteUrl = await this.dmsService.createSiteLibrary(config)

    // Log the creation
    await this.auditService.createAuditEvent(
      'site.library.created',
      createdBy,
      {
        siteCollection,
        libraryName,
        purpose,
        allowedAccessLevels,
        retentionPeriod
      },
      'create_site_lib_' + siteCollection + '_' + libraryName,
      'dms-core'
    )

    return siteUrl
  }
}
