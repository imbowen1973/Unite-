// Meeting Management Service with List-Based Agendas for Unite Platform
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { AIProcessingService, MeetingSummary } from '@/lib/ai'
import { PlannerIntegrationService, PlannerTask } from '@/lib/planner'
import { Meeting, AgendaItem, MeetingAction, MeetingVote, VoteRecord, MeetingPack, VotingPattern } from '@/types/meeting'

export class MeetingManagementService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService
  private documentWorkflowService: DocumentWorkflowService
  private dmsService: DMSService
  private aiProcessingService: AIProcessingService
  private plannerService: PlannerIntegrationService

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
    this.aiProcessingService = new AIProcessingService(sharepointService, auditService)
    this.plannerService = new PlannerIntegrationService(sharepointService, auditService)
  }

  // Create a new meeting draft
  async createMeeting(
    user: TokenPayload,
    title: string,
    committee: string,
    scheduledDate: string,
    description?: string,
    attendees: string[] = [],
    allowedViewers: string[] = [],
    allowedEditors: string[] = [],
    allowedApprovers: string[] = []
  ): Promise<Meeting> {
    // Check if user has permission to create meetings for this committee
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (!userPermissions.committees.includes(committee) && userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to create meetings for this committee')
    }

    const meetingId = this.generateId()
    const docStableId = this.generateDocStableId()
    
    const meeting: Meeting = {
      id: meetingId,
      docStableId,
      title,
      committee,
      scheduledDate,
      status: 'draft',
      organizer: user.oid,
      attendees: [user.oid, ...attendees], // Organizer is initially in the list
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: {
        canViewBeforePublish: [user.oid, ...allowedViewers],
        canEdit: [user.oid, ...allowedEditors],
        canApprove: [user.oid, ...allowedApprovers],
        canPublish: [user.oid] // Only organizer can publish initially
      }
    }

    // Create meeting in SharePoint
    await this.sharepointService.addListItem('meetingsListId', {
      Id: meetingId,
      DocStableId: docStableId,
      Title: title,
      Committee: committee,
      ScheduledDate: scheduledDate,
      Status: 'draft',
      Organizer: user.oid,
      Attendees: [user.oid, ...attendees].join(','),
      CreatedAt: meeting.createdAt,
      UpdatedAt: meeting.updatedAt,
      Permissions: JSON.stringify(meeting.permissions)
    })

    // Register the meeting document in the DMS catalogue
    await this.dmsService.registerDocument(
      docStableId,
      'unite-meetings',
      'Meetings',
      meetingId,
      title,
      'draft'
    )

    // Log the creation action
    await this.auditService.createAuditEvent(
      'meeting.created',
      user.upn,
      {
        meetingId,
        docStableId,
        title,
        committee,
        scheduledDate
      },
      'create_meeting_' + meetingId,
      'unite-meetings'
    )

    return meeting
  }

  // Add an agenda item to a meeting
  async addAgendaItem(
    user: TokenPayload,
    meetingId: string,
    title: string,
    description: string,
    itemOrder: number,
    role: 'information' | 'action' | 'decision' | 'voting' | 'discussion',
    presenter?: string,
    timeAllocation: number = 30,
    supportingDocuments: string[] = [], // docStableIds
    voteRequired: 'none' | 'approval' | 'opinion' = 'none',
    voteType?: 'simple-majority' | 'super-majority' | 'unanimous'
  ): Promise<AgendaItem> {
    // Get meeting details
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to edit this meeting
    if (!this.canEditMeeting(user, meeting)) {
      throw new Error('User does not have permission to add agenda items to this meeting')
    }

    // Validate that supporting documents exist and user has access to them
    for (const docStableId of supportingDocuments) {
      const doc = await this.documentWorkflowService.getDocumentByDocStableId(docStableId)
      if (!doc) {
        throw new Error('Supporting document with docStableId ' + docStableId + ' not found')
      }

      const canAccess = await this.accessControlService.canAccessDocument(
        user,
        {
          id: doc.id,
          title: doc.title,
          state: doc.state,
          allowedAccessLevels: doc.allowedAccessLevels,
          allowedCommittees: doc.committees,
          allowedUsers: [],
          versionHistoryEnabled: doc.versionHistoryEnabled,
          createdAt: doc.createdDate,
          updatedAt: doc.lastModifiedDate
        }
      )

      if (!canAccess) {
        throw new Error('User does not have access to supporting document ' + docStableId)
      }
    }

    const agendaItemId = this.generateId()
    const agendaItem: AgendaItem = {
      id: agendaItemId,
      meetingId,
      title,
      description,
      itemOrder,
      presenter: presenter || user.upn,
      timeAllocation,
      status: 'pending',
      supportingDocuments,
      voteRequired,
      voteType,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create agenda item in SharePoint
    await this.sharepointService.addListItem('agendaItemsListId', {
      Id: agendaItemId,
      MeetingId: meetingId,
      Title: title,
      Description: description,
      ItemOrder: itemOrder,
      Presenter: presenter || user.upn,
      TimeAllocation: timeAllocation,
      Status: 'pending',
      SupportingDocuments: supportingDocuments.join(','),
      VoteRequired: voteRequired,
      VoteType: voteType,
      Role: role,
      CreatedAt: agendaItem.createdAt,
      UpdatedAt: agendaItem.updatedAt
    })

    // If vote is required, create a vote record
    if (voteRequired !== 'none' && voteType) {
      await this.createVoteForAgendaItem(
        user,
        meetingId,
        agendaItemId,
        voteRequired,
        title + ' - Vote',
        description,
        ['Yes', 'No', 'Abstain'], // Default options
        voteType
      )
    }

    // Log the agenda item addition
    await this.auditService.createAuditEvent(
      'agenda_item.added',
      user.upn,
      {
        meetingId,
        agendaItemId,
        title,
        supportingDocuments,
        voteRequired
      },
      'add_agenda_item_' + agendaItemId,
      'unite-meetings'
    )

    return agendaItem
  }

  // Create a vote for an agenda item
  async createVoteForAgendaItem(
    user: TokenPayload,
    meetingId: string,
    agendaItemId: string,
    voteType: 'approval' | 'opinion',
    title: string,
    description: string,
    options: string[],
    requiredVotingPower: 'simple-majority' | 'super-majority' | 'unanimous'
  ): Promise<MeetingVote> {
    const voteId = this.generateId()
    const vote: MeetingVote = {
      id: voteId,
      meetingId,
      agendaItemId,
      voteType,
      title,
      description,
      options,
      status: 'pending',
      requiredVotingPower,
      createdAt: new Date().toISOString(),
      createdBy: user.oid
    }

    // Create vote in SharePoint
    await this.sharepointService.addListItem('votesListId', {
      Id: voteId,
      MeetingId: meetingId,
      AgendaItemId: agendaItemId,
      VoteType: voteType,
      Title: title,
      Description: description,
      Options: options.join(','),
      Status: 'pending',
      RequiredVotingPower: requiredVotingPower,
      CreatedAt: vote.createdAt,
      CreatedBy: user.oid
    })

    // Log the vote creation
    await this.auditService.createAuditEvent(
      'vote.created',
      user.upn,
      {
        voteId,
        meetingId,
        agendaItemId,
        title,
        voteType
      },
      'create_vote_' + voteId,
      'unite-meetings'
    )

    return vote
  }

  // Cast a vote (record a vote)
  async castVote(
    user: TokenPayload,
    voteId: string,
    voteOption: string,
    votingPower: number = 1,
    isPublic: boolean = false
  ): Promise<VoteRecord> {
    // Get the vote details
    const vote = await this.getVote(voteId)
    if (!vote) {
      throw new Error('Vote not found')
    }

    // Check if user is an attendee of the meeting
    const meeting = await this.getMeeting(vote.meetingId)
    if (!meeting || !meeting.attendees.includes(user.oid)) {
      throw new Error('User is not an attendee of this meeting')
    }

    // Check if the vote is still open
    if (vote.status !== 'in-progress') {
      throw new Error('Vote is not currently in progress')
    }

    const voteRecordId = this.generateId()
    const voteRecord: VoteRecord = {
      id: voteRecordId,
      voteId,
      voter: user.oid,
      voteOption,
      votingPower,
      isPublic,
      recordedAt: new Date().toISOString()
    }

    // Create vote record in SharePoint
    await this.sharepointService.addListItem('voteRecordsListId', {
      Id: voteRecordId,
      VoteId: voteId,
      Voter: user.oid,
      VoteOption: voteOption,
      VotingPower: votingPower,
      IsPublic: isPublic,
      RecordedAt: voteRecord.recordedAt
    })

    // Log the vote casting
    await this.auditService.createAuditEvent(
      'vote.cast',
      user.upn,
      {
        voteId,
        voteRecordId,
        voteOption,
        votingPower,
        isPublic
      },
      'cast_vote_' + voteRecordId,
      'unite-meetings'
    )

    return voteRecord
  }

  // Create a meeting pack (collection of documents for the meeting)
  async createMeetingPack(
    user: TokenPayload,
    meetingId: string,
    title: string,
    documentIds: string[] // docStableIds
  ): Promise<MeetingPack> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to create meeting pack
    if (!this.canEditMeeting(user, meeting)) {
      throw new Error('User does not have permission to create meeting pack')
    }

    // Validate documents exist and user has access
    for (const docId of documentIds) {
      const doc = await this.documentWorkflowService.getDocumentByDocStableId(docId)
      if (!doc) {
        throw new Error('Document with docStableId ' + docId + ' not found')
      }
    }

    const packId = this.generateId()
    const meetingPack: MeetingPack = {
      id: packId,
      meetingId,
      title,
      documents: documentIds,
      createdAt: new Date().toISOString(),
      status: 'draft'
    }

    // Create meeting pack in SharePoint
    await this.sharepointService.addListItem('meetingPacksListId', {
      Id: packId,
      MeetingId: meetingId,
      Title: title,
      Documents: documentIds.join(','),
      CreatedAt: meetingPack.createdAt,
      Status: 'draft'
    })

    // Log the meeting pack creation
    await this.auditService.createAuditEvent(
      'meeting_pack.created',
      user.upn,
      {
        packId,
        meetingId,
        title,
        documentCount: documentIds.length
      },
      'create_meeting_pack_' + packId,
      'unite-meetings'
    )

    return meetingPack
  }

  // Approve a meeting pack
  async approveMeetingPack(
    user: TokenPayload,
    packId: string
  ): Promise<MeetingPack> {
    const pack = await this.getMeetingPack(packId)
    if (!pack) {
      throw new Error('Meeting pack not found')
    }

    const meeting = await this.getMeeting(pack.meetingId)
    if (!meeting) {
      throw new Error('Associated meeting not found')
    }

    // Check if user has permission to approve
    if (!meeting.permissions.canApprove.includes(user.oid) && 
        !meeting.permissions.canPublish.includes(user.oid) &&
        (await this.accessControlService.getUserPermissions(user)).accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to approve meeting pack')
    }

    // Update pack status
    pack.status = 'approved'
    pack.approvedBy = user.oid
    pack.approvedAt = new Date().toISOString()

    // Update in SharePoint
    await this.sharepointService.updateListItem('meetingPacksListId', packId, {
      Status: 'approved',
      ApprovedBy: user.oid,
      ApprovedAt: pack.approvedAt
    })

    // Log the approval
    await this.auditService.createAuditEvent(
      'meeting_pack.approved',
      user.upn,
      {
        packId,
        meetingId: pack.meetingId,
        approvedBy: user.oid
      },
      'approve_meeting_pack_' + packId,
      'unite-meetings'
    )

    return pack
  }

  // Publish a meeting (make it visible to attendees)
  async publishMeeting(user: TokenPayload, meetingId: string): Promise<Meeting> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to publish this meeting
    if (!meeting.permissions.canPublish.includes(user.oid) && 
        (await this.accessControlService.getUserPermissions(user)).accessLevel !== AccessLevel.Admin) {
      throw new Error('User does not have permission to publish this meeting')
    }

    // Ensure meeting pack is approved before publishing
    const meetingPack = await this.getMeetingPackForMeeting(meetingId)
    if (meetingPack && meetingPack.status !== 'approved') {
      throw new Error('Meeting pack must be approved before publishing meeting')
    }

    // Update meeting status
    meeting.status = 'published'
    meeting.updatedAt = new Date().toISOString()

    // Update meeting in SharePoint
    await this.updateMeetingInSharePoint(meeting)

    // Notify attendees about the published meeting
    await this.notifyAttendees(meeting, 'meeting_published')

    // Log the publication
    await this.auditService.createAuditEvent(
      'meeting.published',
      user.upn,
      {
        meetingId,
        docStableId: meeting.docStableId,
        title: meeting.title,
        committee: meeting.committee
      },
      'publish_meeting_' + meetingId,
      'unite-meetings'
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
    if (!this.canEditMeeting(user, meeting)) {
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
      'add_attendees_' + meetingId,
      'unite-meetings'
    )

    return meeting
  }

  // Update an agenda item status
  async updateAgendaItemStatus(
    user: TokenPayload,
    agendaItemId: string,
    status: 'pending' | 'in-progress' | 'discussed' | 'deferred' | 'completed',
    discussionOutcome?: string
  ): Promise<AgendaItem> {
    // Get agenda item
    const agendaItemsList = await this.sharepointService.getListItems('agendaItemsListId')
    let agendaItem: any = null
    
    for (const item of agendaItemsList) {
      if (item.fields.Id === agendaItemId) {
        agendaItem = item
        break
      }
    }

    if (!agendaItem) {
      throw new Error('Agenda item not found')
    }

    // Check if user has permission to update this agenda item
    const meeting = await this.getMeeting(agendaItem.fields.MeetingId)
    if (!meeting || !this.canEditMeeting(user, meeting)) {
      throw new Error('User does not have permission to update this agenda item')
    }

    // Update agenda item status
    agendaItem.fields.Status = status
    if (discussionOutcome) {
      agendaItem.fields.DiscussionOutcome = discussionOutcome
    }
    agendaItem.fields.UpdatedAt = new Date().toISOString()

    // Update in SharePoint
    await this.sharepointService.updateListItem('agendaItemsListId', agendaItemId, {
      Status: status,
      DiscussionOutcome: discussionOutcome,
      UpdatedAt: new Date().toISOString()
    })

    // Log the status update
    await this.auditService.createAuditEvent(
      'agenda_item.status_updated',
      user.upn,
      {
        agendaItemId,
        status,
        discussionOutcome: discussionOutcome || null
      },
      'update_agenda_item_' + agendaItemId,
      'unite-meetings'
    )

    return {
      id: agendaItem.fields.Id,
      meetingId: agendaItem.fields.MeetingId,
      title: agendaItem.fields.Title,
      description: agendaItem.fields.Description,
      itemOrder: agendaItem.fields.ItemOrder,
      presenter: agendaItem.fields.Presenter,
      timeAllocation: agendaItem.fields.TimeAllocation,
      status: agendaItem.fields.Status,
      supportingDocuments: agendaItem.fields.SupportingDocuments.split(','),
      voteRequired: agendaItem.fields.VoteRequired as 'none' | 'approval' | 'opinion',
      voteType: agendaItem.fields.VoteType as 'simple-majority' | 'super-majority' | 'unanimous',
      role: agendaItem.fields.Role as 'information' | 'action' | 'decision' | 'voting' | 'discussion',
      discussionOutcome: agendaItem.fields.DiscussionOutcome,
      createdAt: agendaItem.fields.CreatedAt,
      updatedAt: agendaItem.fields.UpdatedAt
    }
  }

  // Create action item from agenda item
  async createActionItem(
    user: TokenPayload,
    meetingId: string,
    agendaItemId: string,
    title: string,
    description: string,
    assignedTo: string[],
    dueDate: string,
    completionCriteria?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<MeetingAction> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to create action items
    if (!this.canEditMeeting(user, meeting)) {
      throw new Error('User does not have permission to create action items for this meeting')
    }

    const actionId = this.generateId()
    const action: MeetingAction = {
      id: actionId,
      meetingId,
      agendaItemId,
      title,
      description,
      assignedTo,
      dueDate,
      status: 'open',
      completionCriteria,
      createdAt: new Date().toISOString(),
      createdBy: user.oid
    }

    // Create the task in Microsoft Planner
    const plannerTask = await this.plannerService.createTaskFromAction(
      user,
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      undefined, // Use default plan
      completionCriteria
    )

    // Link the meeting action to the planner task
    action.plannerTaskId = plannerTask.id

    // Create action item in SharePoint with planner task link
    await this.sharepointService.addListItem('meetingActionsListId', {
      Id: actionId,
      MeetingId: meetingId,
      AgendaItemId: agendaItemId,
      Title: title,
      Description: description,
      AssignedTo: assignedTo.join(','),
      DueDate: dueDate,
      Status: 'open',
      CompletionCriteria: completionCriteria,
      CreatedAt: action.createdAt,
      CreatedBy: user.oid,
      PlannerTaskId: plannerTask.id
    })

    // Log the action creation
    await this.auditService.createAuditEvent(
      'meeting.action_created',
      user.upn,
      {
        meetingId,
        agendaItemId,
        actionId,
        title,
        assignedTo,
        linkedToPlanner: true
      },
      'create_action_' + actionId,
      'unite-meetings'
    )

    return action
  }

  // Update an action item status (synchronized with Planner)
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

    // Synchronize with Microsoft Planner if linked
    if (actionItem.fields.PlannerTaskId) {
      let plannerStatus: 'notStarted' | 'inProgress' | 'completed' | 'cancelled' = 'notStarted'
      switch (status) {
        case 'open':
          plannerStatus = 'notStarted'
          break
        case 'in-progress':
          plannerStatus = 'inProgress'
          break
        case 'completed':
          plannerStatus = 'completed'
          break
        case 'cancelled':
          plannerStatus = 'cancelled'
          break
      }

      await this.plannerService.updateTaskStatus(
        user,
        actionItem.fields.PlannerTaskId,
        plannerStatus,
        status === 'completed' ? 100 : status === 'in-progress' ? 50 : 0
      )
    }

    // Log the status update
    await this.auditService.createAuditEvent(
      'meeting.action_updated',
      user.upn,
      {
        actionId,
        status,
        completedAt,
        synchronizedWithPlanner: !!actionItem.fields.PlannerTaskId
      },
      'update_action_' + actionId,
      'unite-meetings'
    )

    return {
      id: actionItem.fields.Id,
      meetingId: actionItem.fields.MeetingId,
      agendaItemId: actionItem.fields.AgendaItemId,
      title: actionItem.fields.Title,
      description: actionItem.fields.Description,
      assignedTo: actionItem.fields.AssignedTo.split(','),
      dueDate: actionItem.fields.DueDate,
      status: actionItem.fields.Status,
      completionCriteria: actionItem.fields.CompletionCriteria,
      createdAt: actionItem.fields.CreatedAt,
      completedAt: actionItem.fields.CompletedAt,
      createdBy: actionItem.fields.CreatedBy,
      plannerTaskId: actionItem.fields.PlannerTaskId
    }
  }

  // Process Teams transcript and create meeting summary with Planner integration
  async processTeamsTranscript(
    user: TokenPayload,
    meetingId: string,
    transcript: string
  ): Promise<MeetingSummary> {
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Check if user has permission to process transcript
    if (!this.canEditMeeting(user, meeting)) {
      throw new Error('User does not have permission to process meeting transcript')
    }

    // Process the transcript using AI
    const summary = await this.aiProcessingService.processTranscript(user, meetingId, transcript)

    // Update meeting with summary
    meeting.updatedAt = new Date().toISOString()

    // Update meeting in SharePoint
    await this.updateMeetingInSharePoint(meeting)

    // Create Planner tasks for action items
    for (const actionItem of summary.actionItems) {
      // Map the AI-extracted action item to a meeting action
      const meetingAction: MeetingAction = {
        id: this.generateId(),
        meetingId,
        agendaItemId: '', // Will be empty for AI-extracted items
        title: actionItem.title,
        description: actionItem.description,
        assignedTo: actionItem.assignedTo,
        dueDate: actionItem.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days
        status: 'open',
        completionCriteria: actionItem.completionCriteria,
        createdAt: new Date().toISOString(),
        createdBy: user.oid
      }

      // Create the task in Microsoft Planner
      const plannerTask = await this.plannerService.createTaskFromAction(
        user,
        actionItem.title,
        actionItem.description,
        actionItem.assignedTo,
        actionItem.dueDate,
        actionItem.priority,
        undefined, // Use default plan
        actionItem.completionCriteria
      )

      // Link the meeting action to the planner task
      meetingAction.plannerTaskId = plannerTask.id

      // Create action item in SharePoint with planner task link
      await this.sharepointService.addListItem('meetingActionsListId', {
        Id: meetingAction.id,
        MeetingId: meetingAction.meetingId,
        AgendaItemId: meetingAction.agendaItemId,
        Title: meetingAction.title,
        Description: meetingAction.description,
        AssignedTo: meetingAction.assignedTo.join(','),
        DueDate: meetingAction.dueDate,
        Status: meetingAction.status,
        CompletionCriteria: meetingAction.completionCriteria,
        CreatedAt: meetingAction.createdAt,
        CreatedBy: meetingAction.createdBy,
        PlannerTaskId: plannerTask.id
      })
    }

    // Log the transcript processing
    await this.auditService.createAuditEvent(
      'meeting.transcript_processed',
      user.upn,
      {
        meetingId,
        transcriptLength: transcript.length,
        summaryLength: summary.summary.length,
        actionCount: summary.actionItems.length
      },
      'process_transcript_' + meetingId,
      'unite-meetings'
    )

    return summary
  }

  // Get all agenda items for a meeting
  async getAgendaItemsForMeeting(meetingId: string): Promise<AgendaItem[]> {
    const agendaItemsList = await this.sharepointService.getListItems('agendaItemsListId')
    const meetingItems: AgendaItem[] = []

    for (const item of agendaItemsList) {
      if (item.fields.MeetingId === meetingId) {
        meetingItems.push({
          id: item.fields.Id,
          meetingId: item.fields.MeetingId,
          title: item.fields.Title,
          description: item.fields.Description,
          itemOrder: item.fields.ItemOrder,
          presenter: item.fields.Presenter,
          timeAllocation: item.fields.TimeAllocation,
          status: item.fields.Status,
          supportingDocuments: item.fields.SupportingDocuments ? item.fields.SupportingDocuments.split(',') : [],
          voteRequired: item.fields.VoteRequired as 'none' | 'approval' | 'opinion',
          voteType: item.fields.VoteType as 'simple-majority' | 'super-majority' | 'unanimous',
          role: item.fields.Role as 'information' | 'action' | 'decision' | 'voting' | 'discussion',
          discussionOutcome: item.fields.DiscussionOutcome,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        })
      }
    }

    // Sort by item order
    return meetingItems.sort((a, b) => a.itemOrder - b.itemOrder)
  }

  // Get all actions for a meeting
  async getActionsForMeeting(meetingId: string): Promise<MeetingAction[]> {
    const actionsList = await this.sharepointService.getListItems('meetingActionsListId')
    const meetingActions: MeetingAction[] = []
    
    for (const item of actionsList) {
      if (item.fields.MeetingId === meetingId) {
        meetingActions.push({
          id: item.fields.Id,
          meetingId: item.fields.MeetingId,
          agendaItemId: item.fields.AgendaItemId,
          title: item.fields.Title,
          description: item.fields.Description,
          assignedTo: item.fields.AssignedTo.split(','),
          dueDate: item.fields.DueDate,
          status: item.fields.Status,
          completionCriteria: item.fields.CompletionCriteria,
          createdAt: item.fields.CreatedAt,
          completedAt: item.fields.CompletedAt,
          createdBy: item.fields.CreatedBy,
          plannerTaskId: item.fields.PlannerTaskId
        })
      }
    }
    
    return meetingActions
  }

  // Get a meeting by ID
  async getMeeting(meetingId: string): Promise<Meeting | null> {
    const meetingsList = await this.sharepointService.getListItems('meetingsListId')
    
    for (const item of meetingsList) {
      if (item.fields.Id === meetingId) {
        return {
          id: item.fields.Id,
          docStableId: item.fields.DocStableId,
          title: item.fields.Title,
          committee: item.fields.Committee,
          scheduledDate: item.fields.ScheduledDate,
          status: item.fields.Status,
          organizer: item.fields.Organizer,
          attendees: item.fields.Attendees ? item.fields.Attendees.split(',') : [],
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt,
          permissions: item.fields.Permissions ? JSON.parse(item.fields.Permissions) : {
            canViewBeforePublish: [],
            canEdit: [],
            canApprove: [],
            canPublish: []
          }
        }
      }
    }
    
    return null
  }

  // Get vote by ID
  private async getVote(voteId: string): Promise<MeetingVote | null> {
    const votesList = await this.sharepointService.getListItems('votesListId')
    
    for (const item of votesList) {
      if (item.fields.Id === voteId) {
        return {
          id: item.fields.Id,
          meetingId: item.fields.MeetingId,
          agendaItemId: item.fields.AgendaItemId,
          voteType: item.fields.VoteType as 'approval' | 'opinion',
          title: item.fields.Title,
          description: item.fields.Description,
          options: item.fields.Options ? item.fields.Options.split(',') : [],
          status: item.fields.Status,
          requiredVotingPower: item.fields.RequiredVotingPower as 'simple-majority' | 'super-majority' | 'unanimous',
          createdAt: item.fields.CreatedAt,
          completedAt: item.fields.CompletedAt,
          createdBy: item.fields.CreatedBy
        }
      }
    }
    
    return null
  }

  // Get meeting pack for a meeting
  private async getMeetingPackForMeeting(meetingId: string): Promise<MeetingPack | null> {
    const packsList = await this.sharepointService.getListItems('meetingPacksListId')
    
    for (const item of packsList) {
      if (item.fields.MeetingId === meetingId) {
        return {
          id: item.fields.Id,
          meetingId: item.fields.MeetingId,
          title: item.fields.Title,
          documents: item.fields.Documents ? item.fields.Documents.split(',') : [],
          createdAt: item.fields.CreatedAt,
          approvedBy: item.fields.ApprovedBy,
          approvedAt: item.fields.ApprovedAt,
          status: item.fields.Status
        }
      }
    }
    
    return null
  }

  // Get meeting pack by ID
  private async getMeetingPack(packId: string): Promise<MeetingPack | null> {
    const packsList = await this.sharepointService.getListItems('meetingPacksListId')
    
    for (const item of packsList) {
      if (item.fields.Id === packId) {
        return {
          id: item.fields.Id,
          meetingId: item.fields.MeetingId,
          title: item.fields.Title,
          documents: item.fields.Documents ? item.fields.Documents.split(',') : [],
          createdAt: item.fields.CreatedAt,
          approvedBy: item.fields.ApprovedBy,
          approvedAt: item.fields.ApprovedAt,
          status: item.fields.Status
        }
      }
    }
    
    return null
  }

  // Check if user can edit meeting
  private canEditMeeting(user: TokenPayload, meeting: Meeting): boolean {
    return meeting.permissions.canEdit.includes(user.oid) || 
           meeting.organizer === user.oid ||
           (this.accessControlService.getUserPermissions(user) as any).accessLevel === AccessLevel.Admin
  }

  // Notify attendees about meeting updates
  private async notifyAttendees(meeting: Meeting, notificationType: string): Promise<void> {
    // In a real implementation, this would send notifications to attendees
    // For now, we'll just log the notification
    await this.auditService.createAuditEvent(
      'meeting.notification_sent',
      'system',
      {
        meetingId: meeting.id,
        docStableId: meeting.docStableId,
        notificationType,
        attendeeCount: meeting.attendees.length
      },
      'notify_attendees_' + meeting.id + '_' + Date.now(),
      'unite-meetings'
    )
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
      UpdatedAt: meeting.updatedAt,
      Permissions: JSON.stringify(meeting.permissions)
    })
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  // Generate a docStableId for permanent reference
  private generateDocStableId(): string {
    const prefix = 'MTG'
    const suffix = Date.now().toString(36).toUpperCase()
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    return prefix + '-' + suffix + '-' + randomPart
  }
}
