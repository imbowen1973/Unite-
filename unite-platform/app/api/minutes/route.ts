import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { MinutesService } from '@/lib/meeting/minutes-service'
import { TranscriptProcessor } from '@/lib/meeting/transcript-processor'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AgendaItem } from '@/types/meeting'

/**
 * Meeting Minutes API
 *
 * Actions:
 * - initializeFromAgenda: Create minute items from agenda
 * - updateMinuteItem: Update a minute item's discussion
 * - addAobItem: Add Any Other Business item
 * - updateAttendance: Update attendance records
 * - processTranscript: Process transcript with AI
 * - approveMinutes: Approve and lock minutes
 * - circulateMinutes: Send minutes to attendees
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Initialize services
    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const minutesService = new MinutesService(sharepointService, auditService)

    switch (action) {
      case 'initializeFromAgenda': {
        const { meetingId } = body

        if (!meetingId) {
          return NextResponse.json(
            { error: 'Missing required field: meetingId' },
            { status: 400 }
          )
        }

        // Get agenda items for meeting
        const agendaItems = await getAgendaItemsForMeeting(sharepointService, meetingId)

        // Initialize minutes
        const result = await minutesService.initializeMinutesFromAgenda(
          user,
          meetingId,
          agendaItems
        )

        return NextResponse.json({
          success: true,
          minutesId: result.minutesId,
          minuteItems: result.minuteItems,
          message: `Minutes initialized with ${result.minuteItems.length} items`,
        })
      }

      case 'updateMinuteItem': {
        const { minuteItemId, discussion, keyPoints, decision } = body

        if (!minuteItemId) {
          return NextResponse.json(
            { error: 'Missing required field: minuteItemId' },
            { status: 400 }
          )
        }

        const minuteItem = await minutesService.updateMinuteDiscussion(
          user,
          minuteItemId,
          discussion || '',
          keyPoints,
          decision
        )

        return NextResponse.json({
          success: true,
          minuteItem,
        })
      }

      case 'addAobItem': {
        const { meetingId, title, discussion, decision } = body

        if (!meetingId || !title) {
          return NextResponse.json(
            { error: 'Missing required fields: meetingId, title' },
            { status: 400 }
          )
        }

        const minuteItem = await minutesService.addAobItem(
          user,
          meetingId,
          title,
          discussion || '',
          decision
        )

        return NextResponse.json({
          success: true,
          minuteItem,
        })
      }

      case 'updateAttendance': {
        const { minutesId, attendees, apologies, absent } = body

        if (!minutesId) {
          return NextResponse.json(
            { error: 'Missing required field: minutesId' },
            { status: 400 }
          )
        }

        const minutes = await minutesService.updateAttendance(
          user,
          minutesId,
          attendees || [],
          apologies || [],
          absent || []
        )

        return NextResponse.json({
          success: true,
          minutes,
        })
      }

      case 'processTranscript': {
        const { meetingId, transcriptId } = body

        if (!meetingId || !transcriptId) {
          return NextResponse.json(
            { error: 'Missing required fields: meetingId, transcriptId' },
            { status: 400 }
          )
        }

        // Get agenda items
        const agendaItems = await getAgendaItemsForMeeting(sharepointService, meetingId)

        // Process transcript
        const transcriptProcessor = new TranscriptProcessor(sharepointService, auditService)
        const extractedDiscussions = await transcriptProcessor.processTranscript(
          user,
          meetingId,
          transcriptId,
          agendaItems
        )

        // Get minute items
        const minuteItems = await minutesService.getMinuteItemsForMeeting(meetingId)

        // Apply extracted discussions
        const updatedItems = await transcriptProcessor.applyExtractedDiscussions(
          user,
          meetingId,
          extractedDiscussions,
          minuteItems
        )

        return NextResponse.json({
          success: true,
          extractedCount: extractedDiscussions.length,
          updatedItems,
          message: `Processed ${extractedDiscussions.length} agenda items from transcript`,
        })
      }

      case 'approveMinutes': {
        const { minutesId } = body

        if (!minutesId) {
          return NextResponse.json(
            { error: 'Missing required field: minutesId' },
            { status: 400 }
          )
        }

        const minutes = await minutesService.approveMinutes(user, minutesId)

        return NextResponse.json({
          success: true,
          minutes,
          message: 'Minutes approved successfully',
        })
      }

      case 'circulateMinutes': {
        const { minutesId } = body

        if (!minutesId) {
          return NextResponse.json(
            { error: 'Missing required field: minutesId' },
            { status: 400 }
          )
        }

        const minutes = await minutesService.circulateMinutes(user, minutesId)

        return NextResponse.json({
          success: true,
          minutes,
          message: 'Minutes circulated to attendees',
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Minutes API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for fetching minutes
 * Query params:
 * - meetingId: Get minutes for meeting
 * - minutesId: Get specific minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meetingId')
    const minutesId = searchParams.get('minutesId')

    // Initialize services
    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const minutesService = new MinutesService(sharepointService, auditService)

    if (minutesId) {
      // Get specific minutes
      const minutes = await minutesService.getMeetingMinutes(minutesId)

      if (!minutes) {
        return NextResponse.json(
          { error: 'Minutes not found' },
          { status: 404 }
        )
      }

      const minuteItems = await minutesService.getMinuteItemsForMeeting(minutes.meetingId)

      return NextResponse.json({
        success: true,
        minutes,
        minuteItems,
      })
    } else if (meetingId) {
      // Get minutes for meeting
      const minutes = await minutesService.getMeetingMinutesByMeetingId(meetingId)

      if (!minutes) {
        return NextResponse.json({
          success: true,
          minutes: null,
          minuteItems: [],
          message: 'No minutes found for this meeting',
        })
      }

      const minuteItems = await minutesService.getMinuteItemsForMeeting(meetingId)

      return NextResponse.json({
        success: true,
        minutes,
        minuteItems,
      })
    } else {
      return NextResponse.json(
        { error: 'Missing meetingId or minutesId parameter' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Minutes GET error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get agenda items for a meeting
 */
async function getAgendaItemsForMeeting(
  sharepointService: SharePointService,
  meetingId: string
): Promise<AgendaItem[]> {
  const response = await sharepointService.getListItems('agendaItemsListId', {
    filter: `MeetingId eq '${meetingId}'`,
  })

  return response.value.map((item: any) => ({
    id: item.Id,
    meetingId: item.MeetingId,
    title: item.Title,
    description: item.Description,
    itemOrder: item.ItemOrder,
    parentItemId: item.ParentItemId,
    orderPath: item.OrderPath,
    level: item.Level,
    startTime: item.StartTime,
    timeAllocation: item.TimeAllocation,
    endTime: item.EndTime,
    documentId: item.DocumentId,
    docStableId: item.DocStableId,
    presenter: item.Presenter,
    status: item.Status,
    supportingDocuments: item.SupportingDocuments ? JSON.parse(item.SupportingDocuments) : [],
    voteRequired: item.VoteRequired,
    voteType: item.VoteType,
    role: item.Role,
    discussionOutcome: item.DiscussionOutcome,
    createdAt: item.CreatedAt,
    updatedAt: item.UpdatedAt,
  }))
}
