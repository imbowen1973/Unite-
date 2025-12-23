// Meeting Management Service for Unite Platform
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel } from '@/lib/access'
import { DocumentMetadata } from '@/lib/workflow'

export interface Meeting {
  id: string
  title: string
  committee: string
  scheduledDate: string
  status: 'draft' | 'published' | 'completed' | 'cancelled'
  organizer: string
  attendees: string[]
  agendaItems: AgendaItem[]
  minutes?: string
  createdAt: string
  updatedAt: string
}

export interface AgendaItem {
  id: string
  title: string
  documentId?: string
  docStableId?: string
  description: string
  presenter?: string
  timeAllocation: number // in minutes
  status: 'pending' | 'discussed' | 'deferred' | 'completed'
}

export interface MeetingAction {
  id: string
  meetingId: string
  title: string
  description: string
  assignedTo: string[]
  dueDate: string
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
  createdAt: string
  completedAt?: string
}

export class MeetingService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
  }

  // Create a new meeting draft
  async createMeeting(
    user: TokenPayload,
    title: string,
    committee: string,
    scheduledDate: string,
    description?: string
  ): Promise<Meeting> {
    // Check if user has permission to create meetings for this committee
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (!userPermissions.committees.includes(committee) && userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to create meetings for this committee')
    }

    const meetingId = this.generateId()
    
    const meeting: Meeting = {
      id: meetingId,
      title,
      committee,
      scheduledDate,
      status: 'draft',
      organizer: user.oid,
      attendees: [user.oid], // Organizer is initially the only attendee
      agendaItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create meeting in SharePoint
    await this.sharepointService.addListItem('meetingsListId', {
      Id: meetingId,
      Title: title,
      Committee: committee,
      ScheduledDate: scheduledDate,
      Status: 'draft',
      Organizer: user.oid,
      Attendees: [user.oid].join(','),
      CreatedAt: meeting.createdAt,
      UpdatedAt: meeting.updatedAt
    })

    // Log the creation action
    await this.auditService.createAuditEvent(
      'meeting.created',
      user.upn,
      {
        meetingId,
        title,
        committee,
        scheduledDate
      },
      'create_meeting_' + meetingId
    )

    return meeting
  }

  // Add an agenda item to a meeting
  async addAgendaItem(
    user: TokenPayload,
    meetingId: string,
    title: string,
    docStableId?: string,
    description?: string,
    presenter?: string,
    timeAllocation: number = 30
  ): Promise<AgendaItem> {
    // Get meeting details
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to edit this meeting
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (meeting.organizer !== user.oid && 
        !userPermissions.committees.includes(meeting.committee) && 
        userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to add agenda items to this meeting')
    }

    // If a document is referenced, check if user has access to it
    if (docStableId) {
      const docWorkflowService = new (await import('@/lib/workflow')).DocumentWorkflowService(
        this.sharepointService,
        this.auditService,
        this.accessControlService
      )
      
      const document = await docWorkflowService.getDocumentByDocStableId(docStableId)
      if (!document) {
        throw new Error('Referenced document not found')
      }

      const canAccess = await this.accessControlService.canAccessDocument(user, {
        id: document.id,
        title: document.title,
        state: document.state,
        allowedAccessLevels: document.allowedAccessLevels,
        allowedCommittees: document.committees,
        allowedUsers: [],
        versionHistoryEnabled: document.versionHistoryEnabled,
        createdAt: document.createdDate,
        updatedAt: document.lastModifiedDate
      })

      if (!canAccess) {
        throw new Error('User does not have access to the referenced document')
      }
    }

    const agendaItemId = this.generateId()
    const agendaItem: AgendaItem = {
      id: agendaItemId,
      title,
      docStableId,
      description: description || '',
      presenter: presenter || user.upn,
      timeAllocation,
      status: 'pending'
    }

    // Update meeting with new agenda item
    meeting.agendaItems.push(agendaItem)
    meeting.updatedAt = new Date().toISOString()

    // Update meeting in SharePoint
    await this.updateMeetingInSharePoint(meeting)

    // Log the agenda item addition
    await this.auditService.createAuditEvent(
      'agenda_item.added',
      user.upn,
      {
        meetingId,
        agendaItemId,
        title,
        docStableId
      },
      'add_agenda_item_' + agendaItemId
    )

    return agendaItem
  }

  // Publish a meeting (make it visible to committee members)
  async publishMeeting(user: TokenPayload, meetingId: string): Promise<Meeting> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to publish this meeting
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (meeting.organizer !== user.oid && userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to publish this meeting')
    }

    // Update meeting status
    meeting.status = 'published'
    meeting.updatedAt = new Date().toISOString()

    // Update meeting in SharePoint
    await this.updateMeetingInSharePoint(meeting)

    // Log the publication
    await this.auditService.createAuditEvent(
      'meeting.published',
      user.upn,
      {
        meetingId,
        title: meeting.title,
        committee: meeting.committee
      },
      'publish_meeting_' + meetingId
    )

    return meeting
  }

  // Add attendees to a meeting
  async addAttendees(user: TokenPayload, meetingId: string, attendees: string[]): Promise<Meeting> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to modify attendees
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (meeting.organizer !== user.oid && userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to modify meeting attendees')
    }

    // Add new attendees
    const uniqueAttendees = [...new Set([...meeting.attendees, ...attendees])]
    meeting.attendees = uniqueAttendees
    meeting.updatedAt = new Date().toISOString()

    // Update meeting in SharePoint
    await this.updateMeetingInSharePoint(meeting)

    // Log the attendee addition
    await this.auditService.createAuditEvent(
      'meeting.attendees_added',
      user.upn,
      {
        meetingId,
        attendeesAdded: attendees,
        totalAttendees: meeting.attendees.length
      },
      'add_attendees_' + meetingId
    )

    return meeting
  }

  // Create meeting minutes
  async createMinutes(user: TokenPayload, meetingId: string, minutes: string): Promise<Meeting> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to create minutes
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (meeting.organizer !== user.oid && 
        userPermissions.accessLevel !== AccessLevel.Admin && 
        userPermissions.accessLevel !== AccessLevel.Executive) {
      throw new Error('User does not have permission to create meeting minutes')
    }

    // Update meeting with minutes
    meeting.minutes = minutes
    meeting.updatedAt = new Date().toISOString()

    // Update meeting in SharePoint
    await this.updateMeetingInSharePoint(meeting)

    // Log the minutes creation
    await this.auditService.createAuditEvent(
      'meeting.minutes_created',
      user.upn,
      {
        meetingId,
        minutesLength: minutes.length
      },
      'create_minutes_' + meetingId
    )

    return meeting
  }

  // Create a meeting action item
  async createActionItem(
    user: TokenPayload,
    meetingId: string,
    title: string,
    description: string,
    assignedTo: string[],
    dueDate: string
  ): Promise<MeetingAction> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to create action items
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (!userPermissions.committees.includes(meeting.committee) && 
        userPermissions.accessLevel !== AccessLevel.Admin && 
        userPermissions.accessLevel !== AccessLevel.Executive) {
      throw new Error('User does not have permission to create action items for this meeting')
    }

    const actionId = this.generateId()
    const action: MeetingAction = {
      id: actionId,
      meetingId,
      title,
      description,
      assignedTo,
      dueDate,
      status: 'open',
      createdAt: new Date().toISOString()
    }

    // Create action item in SharePoint
    await this.sharepointService.addListItem('meetingActionsListId', {
      Id: actionId,
      MeetingId: meetingId,
      Title: title,
      Description: description,
      AssignedTo: assignedTo.join(','),
      DueDate: dueDate,
      Status: 'open',
      CreatedAt: action.createdAt
    })

    // Log the action creation
    await this.auditService.createAuditEvent(
      'meeting.action_created',
      user.upn,
      {
        meetingId,
        actionId,
        title,
        assignedTo
      },
      'create_action_' + actionId
    )

    return action
  }

  // Update an action item status
  async updateActionStatus(
    user: TokenPayload,
    actionId: string,
    status: 'open' | 'in-progress' | 'completed' | 'cancelled',
    completedAt?: string
  ): Promise<MeetingAction> {
    // Get action item
    const actionsList = await this.sharepointService.getListItems('meetingActionsListId')
    let actionItem: any = null
    
    for (const item of actionsList) {
      if (item.fields.Id === actionId) {
        actionItem = item
        break
      }
    }

    if (!actionItem) {
      throw new Error('Action item not found')
    }

    // Check if user is assigned to this action or has admin privileges
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    const assignedUsers = actionItem.fields.AssignedTo.split(',')
    if (!assignedUsers.includes(user.oid) && userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to update this action item')
    }

    // Update action status
    actionItem.fields.Status = status
    actionItem.fields.CompletedAt = completedAt || (status === 'completed' ? new Date().toISOString() : null)
    actionItem.fields.UpdatedAt = new Date().toISOString()

    // Update in SharePoint
    await this.sharepointService.updateListItem('meetingActionsListId', actionId, {
      Status: status,
      CompletedAt: completedAt || (status === 'completed' ? new Date().toISOString() : null),
      UpdatedAt: new Date().toISOString()
    })

    // Log the status update
    await this.auditService.createAuditEvent(
      'meeting.action_updated',
      user.upn,
      {
        actionId,
        status,
        completedAt
      },
      'update_action_' + actionId
    )

    return {
      id: actionItem.fields.Id,
      meetingId: actionItem.fields.MeetingId,
      title: actionItem.fields.Title,
      description: actionItem.fields.Description,
      assignedTo: actionItem.fields.AssignedTo.split(','),
      dueDate: actionItem.fields.DueDate,
      status: actionItem.fields.Status,
      createdAt: actionItem.fields.CreatedAt,
      completedAt: actionItem.fields.CompletedAt
    }
  }

  // Get a meeting by ID
  async getMeeting(meetingId: string): Promise<Meeting | null> {
    const meetingsList = await this.sharepointService.getListItems('meetingsListId')
    
    for (const item of meetingsList) {
      if (item.fields.Id === meetingId) {
        return {
          id: item.fields.Id,
          title: item.fields.Title,
          committee: item.fields.Committee,
          scheduledDate: item.fields.ScheduledDate,
          status: item.fields.Status,
          organizer: item.fields.Organizer,
          attendees: item.fields.Attendees ? item.fields.Attendees.split(',') : [],
          agendaItems: [], // Would be loaded separately
          minutes: item.fields.Minutes,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        }
      }
    }
    
    return null
  }

  // Update meeting in SharePoint
  private async updateMeetingInSharePoint(meeting: Meeting): Promise<void> {
    await this.sharepointService.updateListItem('meetingsListId', meeting.id, {
      Title: meeting.title,
      Committee: meeting.committee,
      ScheduledDate: meeting.scheduledDate,
      Status: meeting.status,
      Organizer: meeting.organizer,
      Attendees: meeting.attendees.join(','),
      Minutes: meeting.minutes,
      UpdatedAt: meeting.updatedAt
    })
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }
}
