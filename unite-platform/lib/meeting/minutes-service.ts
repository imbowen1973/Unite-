// Meeting Minutes Service
// Manages meeting minutes stored in SharePoint lists

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import {
  MinuteItem,
  MeetingMinutes,
  AgendaItem,
  Meeting,
  AttendanceRecord,
  MeetingAction,
} from '@/types/meeting'
import { randomUUID } from 'crypto'

export class MinutesService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  /**
   * Initialize minutes from finalized agenda
   * Creates a MinuteItem for each AgendaItem
   */
  async initializeMinutesFromAgenda(
    user: TokenPayload,
    meetingId: string,
    agendaItems: AgendaItem[]
  ): Promise<{ minutesId: string; minuteItems: MinuteItem[] }> {
    // Get meeting details
    const meeting = await this.getMeeting(meetingId)
    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Create MeetingMinutes record
    const minutesId = randomUUID()
    const meetingMinutes: MeetingMinutes = {
      id: minutesId,
      meetingId,
      meetingTitle: meeting.title,
      committee: meeting.committee,
      meetingDate: meeting.scheduledDate,
      startTime: new Date().toISOString(), // Will be updated when meeting starts
      endTime: '', // Will be updated when meeting ends
      attendees: [],
      apologies: [],
      absent: [],
      minuteItems: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
    }

    // Save MeetingMinutes
    await this.sharepointService.addListItem('meetingMinutesListId', {
      Id: minutesId,
      MeetingId: meetingId,
      MeetingTitle: meeting.title,
      Committee: meeting.committee,
      MeetingDate: meeting.scheduledDate,
      StartTime: meetingMinutes.startTime,
      EndTime: meetingMinutes.endTime,
      Attendees: JSON.stringify([]),
      Apologies: JSON.stringify([]),
      Absent: JSON.stringify([]),
      MinuteItems: JSON.stringify([]),
      Status: 'draft',
      Version: '1.0',
      CreatedAt: meetingMinutes.createdAt,
      UpdatedAt: meetingMinutes.updatedAt,
    })

    // Create MinuteItem for each AgendaItem (except breaks)
    const minuteItems: MinuteItem[] = []

    for (const agendaItem of agendaItems.filter(item => item.role !== 'break')) {
      const minuteItemId = randomUUID()

      const minuteItem: MinuteItem = {
        id: minuteItemId,
        meetingId,
        agendaItemId: agendaItem.id,
        agendaTitle: agendaItem.title,
        agendaPurpose: agendaItem.description,
        orderPath: agendaItem.orderPath,
        level: agendaItem.level,
        discussion: '', // To be filled during/after meeting
        actions: [],
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Save to SharePoint
      await this.sharepointService.addListItem('minuteItemsListId', {
        Id: minuteItemId,
        MeetingId: meetingId,
        AgendaItemId: agendaItem.id,
        AgendaTitle: agendaItem.title,
        AgendaPurpose: agendaItem.description,
        OrderPath: agendaItem.orderPath,
        Level: agendaItem.level,
        Discussion: '',
        DiscussionSummary: '',
        KeyPoints: JSON.stringify([]),
        Decision: '',
        VotingResult: '',
        Actions: JSON.stringify([]),
        Presenters: JSON.stringify([]),
        Status: 'draft',
        CreatedAt: minuteItem.createdAt,
        UpdatedAt: minuteItem.updatedAt,
      })

      minuteItems.push(minuteItem)
    }

    // Update MeetingMinutes with minute item IDs
    const minuteItemIds = minuteItems.map(item => item.id)
    await this.sharepointService.updateListItem('meetingMinutesListId', minutesId, {
      MinuteItems: JSON.stringify(minuteItemIds),
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.minutes_initialized',
      user.upn,
      {
        meetingId,
        minutesId,
        itemCount: minuteItems.length,
      },
      `initialize_minutes_${meetingId}`,
      'unite-meetings'
    )

    return { minutesId, minuteItems }
  }

  /**
   * Update a minute item's discussion
   */
  async updateMinuteDiscussion(
    user: TokenPayload,
    minuteItemId: string,
    discussion: string,
    keyPoints?: string[],
    decision?: string
  ): Promise<MinuteItem> {
    const minuteItem = await this.getMinuteItem(minuteItemId)
    if (!minuteItem) {
      throw new Error('Minute item not found')
    }

    const updates: any = {
      Discussion: discussion,
      LastEditedBy: user.upn,
      LastEditedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    }

    if (keyPoints) {
      updates.KeyPoints = JSON.stringify(keyPoints)
    }

    if (decision) {
      updates.Decision = decision
    }

    await this.sharepointService.updateListItem('minuteItemsListId', minuteItemId, updates)

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.minute_updated',
      user.upn,
      {
        minuteItemId,
        meetingId: minuteItem.meetingId,
        agendaItemId: minuteItem.agendaItemId,
      },
      `update_minute_${minuteItemId}`,
      'unite-meetings'
    )

    return {
      ...minuteItem,
      discussion,
      keyPoints,
      decision,
      lastEditedBy: user.upn,
      lastEditedAt: updates.LastEditedAt,
      updatedAt: updates.UpdatedAt,
    }
  }

  /**
   * Add action to a minute item
   */
  async addActionToMinute(
    user: TokenPayload,
    minuteItemId: string,
    action: MeetingAction
  ): Promise<MinuteItem> {
    const minuteItem = await this.getMinuteItem(minuteItemId)
    if (!minuteItem) {
      throw new Error('Minute item not found')
    }

    const updatedActions = [...minuteItem.actions, action.id]

    await this.sharepointService.updateListItem('minuteItemsListId', minuteItemId, {
      Actions: JSON.stringify(updatedActions),
      UpdatedAt: new Date().toISOString(),
    })

    return {
      ...minuteItem,
      actions: updatedActions,
    }
  }

  /**
   * Update attendance records
   */
  async updateAttendance(
    user: TokenPayload,
    minutesId: string,
    attendees: AttendanceRecord[],
    apologies: string[],
    absent: string[]
  ): Promise<MeetingMinutes> {
    const minutes = await this.getMeetingMinutes(minutesId)
    if (!minutes) {
      throw new Error('Meeting minutes not found')
    }

    await this.sharepointService.updateListItem('meetingMinutesListId', minutesId, {
      Attendees: JSON.stringify(attendees),
      Apologies: JSON.stringify(apologies),
      Absent: JSON.stringify(absent),
      UpdatedAt: new Date().toISOString(),
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.attendance_updated',
      user.upn,
      {
        minutesId,
        meetingId: minutes.meetingId,
        attendeeCount: attendees.length,
      },
      `update_attendance_${minutesId}`,
      'unite-meetings'
    )

    return {
      ...minutes,
      attendees,
      apologies,
      absent,
    }
  }

  /**
   * Add AoB (Any Other Business) item
   */
  async addAobItem(
    user: TokenPayload,
    meetingId: string,
    title: string,
    discussion: string,
    decision?: string
  ): Promise<MinuteItem> {
    const minuteItemId = randomUUID()

    // Get highest order path to append AoB at end
    const allMinutes = await this.getMinuteItemsForMeeting(meetingId)
    const maxOrderPath = allMinutes.reduce((max, item) => {
      const orderNum = parseInt(item.orderPath.split('.')[0])
      return orderNum > max ? orderNum : max
    }, 0)

    const minuteItem: MinuteItem = {
      id: minuteItemId,
      meetingId,
      agendaItemId: 'aob', // Special marker for AoB
      agendaTitle: title,
      agendaPurpose: 'Any Other Business',
      orderPath: `${maxOrderPath + 1}`,
      level: 0,
      discussion,
      decision,
      actions: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.sharepointService.addListItem('minuteItemsListId', {
      Id: minuteItemId,
      MeetingId: meetingId,
      AgendaItemId: 'aob',
      AgendaTitle: title,
      AgendaPurpose: 'Any Other Business',
      OrderPath: minuteItem.orderPath,
      Level: 0,
      Discussion: discussion,
      Decision: decision || '',
      Actions: JSON.stringify([]),
      Status: 'draft',
      CreatedAt: minuteItem.createdAt,
      UpdatedAt: minuteItem.updatedAt,
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.aob_added',
      user.upn,
      {
        minuteItemId,
        meetingId,
        title,
      },
      `add_aob_${minuteItemId}`,
      'unite-meetings'
    )

    return minuteItem
  }

  /**
   * Approve minutes
   */
  async approveMinutes(
    user: TokenPayload,
    minutesId: string
  ): Promise<MeetingMinutes> {
    const minutes = await this.getMeetingMinutes(minutesId)
    if (!minutes) {
      throw new Error('Meeting minutes not found')
    }

    await this.sharepointService.updateListItem('meetingMinutesListId', minutesId, {
      Status: 'approved',
      ApprovedBy: user.upn,
      ApprovedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    })

    // Update all minute items to approved
    const minuteItems = await this.getMinuteItemsForMeeting(minutes.meetingId)
    for (const item of minuteItems) {
      await this.sharepointService.updateListItem('minuteItemsListId', item.id, {
        Status: 'approved',
        ApprovedBy: user.upn,
        ApprovedAt: new Date().toISOString(),
      })
    }

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.minutes_approved',
      user.upn,
      {
        minutesId,
        meetingId: minutes.meetingId,
      },
      `approve_minutes_${minutesId}`,
      'unite-meetings'
    )

    return {
      ...minutes,
      status: 'approved',
      approvedBy: user.upn,
      approvedAt: new Date().toISOString(),
    }
  }

  /**
   * Circulate minutes to attendees
   */
  async circulateMinutes(
    user: TokenPayload,
    minutesId: string
  ): Promise<MeetingMinutes> {
    const minutes = await this.getMeetingMinutes(minutesId)
    if (!minutes) {
      throw new Error('Meeting minutes not found')
    }

    await this.sharepointService.updateListItem('meetingMinutesListId', minutesId, {
      Status: 'circulated',
      CirculatedBy: user.upn,
      CirculatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.minutes_circulated',
      user.upn,
      {
        minutesId,
        meetingId: minutes.meetingId,
      },
      `circulate_minutes_${minutesId}`,
      'unite-meetings'
    )

    // TODO: Send email notifications to attendees

    return {
      ...minutes,
      status: 'circulated',
      circulatedBy: user.upn,
      circulatedAt: new Date().toISOString(),
    }
  }

  /**
   * Get minute items for a meeting (sorted by orderPath)
   */
  async getMinuteItemsForMeeting(meetingId: string): Promise<MinuteItem[]> {
    const response = await this.sharepointService.getListItems('minuteItemsListId', {
      filter: `MeetingId eq '${meetingId}'`,
    })

    const items = response.value.map((item: any) => this.mapMinuteItemFromSharePoint(item))

    // Sort by orderPath
    return items.sort((a, b) => this.compareOrderPaths(a.orderPath, b.orderPath))
  }

  /**
   * Get meeting minutes by ID
   */
  async getMeetingMinutes(minutesId: string): Promise<MeetingMinutes | null> {
    try {
      const item = await this.sharepointService.getListItem('meetingMinutesListId', minutesId)
      return this.mapMeetingMinutesFromSharePoint(item)
    } catch (error) {
      return null
    }
  }

  /**
   * Get meeting minutes by meeting ID
   */
  async getMeetingMinutesByMeetingId(meetingId: string): Promise<MeetingMinutes | null> {
    const response = await this.sharepointService.getListItems('meetingMinutesListId', {
      filter: `MeetingId eq '${meetingId}'`,
    })

    if (response.value.length === 0) {
      return null
    }

    return this.mapMeetingMinutesFromSharePoint(response.value[0])
  }

  /**
   * Get minute item by ID
   */
  async getMinuteItem(minuteItemId: string): Promise<MinuteItem | null> {
    try {
      const item = await this.sharepointService.getListItem('minuteItemsListId', minuteItemId)
      return this.mapMinuteItemFromSharePoint(item)
    } catch (error) {
      return null
    }
  }

  // Helper methods
  private async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const item = await this.sharepointService.getListItem('meetingsListId', meetingId)
      return {
        id: item.Id,
        docStableId: item.DocStableId,
        title: item.Title,
        committee: item.Committee,
        scheduledDate: item.ScheduledDate,
        status: item.Status,
        organizer: item.Organizer,
        attendees: JSON.parse(item.Attendees || '[]'),
        createdAt: item.CreatedAt,
        updatedAt: item.UpdatedAt,
        permissions: JSON.parse(item.Permissions || '{}'),
      }
    } catch (error) {
      return null
    }
  }

  private mapMinuteItemFromSharePoint(item: any): MinuteItem {
    return {
      id: item.Id,
      meetingId: item.MeetingId,
      agendaItemId: item.AgendaItemId,
      agendaTitle: item.AgendaTitle,
      agendaPurpose: item.AgendaPurpose,
      orderPath: item.OrderPath,
      level: item.Level,
      discussion: item.Discussion || '',
      discussionSummary: item.DiscussionSummary,
      keyPoints: item.KeyPoints ? JSON.parse(item.KeyPoints) : [],
      decision: item.Decision,
      votingResult: item.VotingResult ? JSON.parse(item.VotingResult) : undefined,
      actions: item.Actions ? JSON.parse(item.Actions) : [],
      presenters: item.Presenters ? JSON.parse(item.Presenters) : [],
      status: item.Status,
      lastEditedBy: item.LastEditedBy,
      lastEditedAt: item.LastEditedAt,
      approvedBy: item.ApprovedBy,
      approvedAt: item.ApprovedAt,
      transcriptSegment: item.TranscriptSegment ? JSON.parse(item.TranscriptSegment) : undefined,
      createdAt: item.CreatedAt,
      updatedAt: item.UpdatedAt,
    }
  }

  private mapMeetingMinutesFromSharePoint(item: any): MeetingMinutes {
    return {
      id: item.Id,
      meetingId: item.MeetingId,
      meetingTitle: item.MeetingTitle,
      committee: item.Committee,
      meetingDate: item.MeetingDate,
      startTime: item.StartTime,
      endTime: item.EndTime,
      location: item.Location,
      attendees: JSON.parse(item.Attendees || '[]'),
      apologies: JSON.parse(item.Apologies || '[]'),
      absent: JSON.parse(item.Absent || '[]'),
      minuteItems: JSON.parse(item.MinuteItems || '[]'),
      additionalNotes: item.AdditionalNotes,
      nextMeetingDate: item.NextMeetingDate,
      status: item.Status,
      circulatedAt: item.CirculatedAt,
      circulatedBy: item.CirculatedBy,
      approvedAt: item.ApprovedAt,
      approvedBy: item.ApprovedBy,
      pdfUrl: item.PdfUrl,
      pdfGeneratedAt: item.PdfGeneratedAt,
      createdAt: item.CreatedAt,
      updatedAt: item.UpdatedAt,
      version: item.Version,
    }
  }

  private compareOrderPaths(a: string, b: string): number {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)

    const maxLength = Math.max(aParts.length, bParts.length)

    for (let i = 0; i < maxLength; i++) {
      const aVal = aParts[i] || 0
      const bVal = bParts[i] || 0

      if (aVal < bVal) return -1
      if (aVal > bVal) return 1
    }

    return 0
  }
}
