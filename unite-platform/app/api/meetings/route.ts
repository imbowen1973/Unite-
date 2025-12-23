// Meetings API for Unite Platform with AI and Planner Integration
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { MeetingManagementService } from '@/lib/meeting'

// Initialize services
const sharepointService = new SharePointService({
  tenantUrl: process.env.SHAREPOINT_TENANT_URL || '',
  clientId: process.env.SHAREPOINT_CLIENT_ID || '',
  clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
  siteId: process.env.SHAREPOINT_SITE_ID || ''
})

const auditService = new AuditService(sharepointService)
const accessControlService = new AccessControlService(sharepointService, auditService)
const dmsService = new DMSService(sharepointService, auditService)
const documentWorkflowService = new DocumentWorkflowService(
  sharepointService,
  auditService,
  accessControlService,
  dmsService
)
const meetingService = new MeetingManagementService(
  sharepointService,
  auditService,
  accessControlService,
  documentWorkflowService,
  dmsService
)

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
      case 'create':
        // Create a new meeting
        const { title, committee, scheduledDate, description, attendees, allowedViewers, allowedEditors, allowedApprovers } = body
        const meeting = await meetingService.createMeeting(
          user,
          title,
          committee,
          scheduledDate,
          description,
          attendees || [],
          allowedViewers || [],
          allowedEditors || [],
          allowedApprovers || []
        )
        return NextResponse.json(meeting)
        
      case 'addAgendaItem':
        // Add an agenda item to a meeting
        const { meetingId, agendaTitle, agendaDescription, presenter, timeAllocation, supportingDocuments } = body
        const agendaItem = await meetingService.addAgendaItem(
          user,
          meetingId,
          agendaTitle,
          agendaDescription,
          presenter,
          timeAllocation || 30,
          supportingDocuments || []
        )
        return NextResponse.json(agendaItem)
        
      case 'createMeetingPack':
        // Create a meeting pack
        const { packMeetingId, packTitle, documentIds } = body
        const meetingPack = await meetingService.createMeetingPack(
          user,
          packMeetingId,
          packTitle,
          documentIds || []
        )
        return NextResponse.json(meetingPack)
        
      case 'approveMeetingPack':
        // Approve a meeting pack
        const { packId } = body
        const approvedPack = await meetingService.approveMeetingPack(user, packId)
        return NextResponse.json(approvedPack)
        
      case 'publish':
        // Publish a meeting
        const publishedMeeting = await meetingService.publishMeeting(user, meetingId)
        return NextResponse.json(publishedMeeting)
        
      case 'addAttendees':
        // Add attendees to a meeting
        const { attendeesToAdd } = body
        const updatedMeeting = await meetingService.addAttendees(user, meetingId, attendeesToAdd || [])
        return NextResponse.json(updatedMeeting)
        
      case 'createMinutes':
        // Create meeting minutes
        const { minutes } = body
        const meetingWithMinutes = await meetingService.createMinutes(user, meetingId, minutes)
        return NextResponse.json(meetingWithMinutes)
        
      case 'processTranscript':
        // Process Teams transcript with AI and Planner integration
        const { transcript } = body
        const transcriptResult = await meetingService.processTeamsTranscript(user, meetingId, transcript)
        return NextResponse.json(transcriptResult)
        
      case 'createAction':
        // Create a meeting action item with Planner integration
        const { actionTitle, actionDescription, assignedTo, dueDate, completionCriteria, priority } = body
        const actionItem = await meetingService.createActionItem(
          user,
          meetingId,
          actionTitle,
          actionDescription,
          assignedTo || [],
          dueDate,
          completionCriteria,
          priority || 'medium'
        )
        return NextResponse.json(actionItem)
        
      case 'updateActionStatus':
        // Update an action item status (synchronized with Planner)
        const { actionId, status, completedAt } = body
        const updatedAction = await meetingService.updateActionStatus(
          user,
          actionId,
          status,
          completedAt
        )
        return NextResponse.json(updatedAction)
        
      case 'createNextAgenda':
        // Create agenda for next meeting with matters arising
        const { previousMeetingId, nextMeetingTitle, nextMeetingDate } = body
        const nextMeeting = await meetingService.createNextMeetingAgenda(
          user,
          previousMeetingId,
          nextMeetingTitle,
          nextMeetingDate
        )
        return NextResponse.json(nextMeeting)
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Meetings API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const user = await verifyToken(token)
    
    // Get meeting ID from query parameters
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meetingId')
    const action = searchParams.get('action')
    
    if (!meetingId && action !== 'getNextActions') {
      return NextResponse.json({ error: 'meetingId parameter is required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'get':
        // Get meeting by ID
        result = await meetingService.getMeeting(meetingId!)
        break
        
      case 'getNextActions':
        // Get open actions from all meetings to show in executive dashboard
        // This would require a different implementation
        result = { message: 'Not implemented in this example' }
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!result) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Log the access for audit trail
    await auditService.createAuditEvent(
      'meeting.accessed',
      user.upn,
      {
        meetingId,
        userId: user.oid,
        action
      },
      'access_meeting_' + meetingId + '_' + Date.now(),
      'unite-meetings'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Meetings API GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
