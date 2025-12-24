// Voting API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { MeetingManagementService } from '@/lib/meeting'
import {
  validateAction,
  validateStringArray,
  ValidationError
} from '@/lib/validation/input'

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
      case 'createVote':
        // Create a new vote for an agenda item
        const { meetingId, agendaItemId, voteType, title, description, options, requiredVotingPower } = body
        const vote = await meetingService.createVoteForAgendaItem(
          user,
          meetingId,
          agendaItemId,
          voteType,
          title,
          description,
          options || ['Yes', 'No', 'Abstain'],
          requiredVotingPower || 'simple-majority'
        )
        return NextResponse.json(vote)
        
      case 'castVote':
        // Record a user's vote
        const { voteId, voteOption, votingPower, isPublic } = body
        const voteRecord = await meetingService.castVote(
          user,
          voteId,
          voteOption,
          votingPower || 1,
          isPublic || false
        )
        return NextResponse.json(voteRecord)
        
      case 'startVote':
        // Start a vote (change status to in-progress)
        const startVoteId = body.voteId
        // In a real implementation, this would update the vote status
        // For now, we'll return a success message
        return NextResponse.json({ message: 'Vote started successfully', voteId: startVoteId })
        
      case 'endVote':
        // End a vote (change status to completed)
        const endVoteId = body.voteId
        // In a real implementation, this would update the vote status
        // For now, we'll return a success message
        return NextResponse.json({ message: 'Vote ended successfully', voteId: endVoteId })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Voting API error:', error)

    // Return user-friendly error for validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Don't leak implementation details for other errors
    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
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
    
    // Get parameters from query
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const voteId = searchParams.get('voteId')
    const meetingId = searchParams.get('meetingId')
    const agendaItemId = searchParams.get('agendaItemId')
    
    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'getVote':
        // Get vote details
        if (!voteId) {
          return NextResponse.json({ error: 'voteId parameter is required for getVote action' }, { status: 400 })
        }
        // In a real implementation, this would call the meeting service to get vote details
        // For now, we'll return mock data
        result = { 
          id: voteId,
          title: 'Mock Vote Title',
          description: 'Mock Vote Description',
          options: ['Yes', 'No', 'Abstain'],
          status: 'in-progress',
          requiredVotingPower: 'simple-majority',
          createdAt: new Date().toISOString()
        }
        break
        
      case 'getVotesForMeeting':
        // Get all votes for a meeting
        if (!meetingId) {
          return NextResponse.json({ error: 'meetingId parameter is required for getVotesForMeeting action' }, { status: 400 })
        }
        // In a real implementation, this would call the meeting service to get votes for meeting
        // For now, we'll return mock data
        result = [
          { 
            id: 'vote-1',
            agendaItemId: 'item-1',
            title: 'Policy Change Vote',
            description: 'Vote on new policy change',
            options: ['Yes', 'No', 'Abstain'],
            status: 'completed',
            requiredVotingPower: 'simple-majority',
            createdAt: new Date().toISOString()
          },
          { 
            id: 'vote-2',
            agendaItemId: 'item-2',
            title: 'Budget Approval',
            description: 'Approve the proposed budget',
            options: ['Approve', 'Reject'],
            status: 'in-progress',
            requiredVotingPower: 'simple-majority',
            createdAt: new Date().toISOString()
          }
        ]
        break
        
      case 'getVotesForAgendaItem':
        // Get all votes for an agenda item
        if (!agendaItemId) {
          return NextResponse.json({ error: 'agendaItemId parameter is required for getVotesForAgendaItem action' }, { status: 400 })
        }
        // In a real implementation, this would call the meeting service to get votes for agenda item
        // For now, we'll return mock data
        result = [
          { 
            id: 'vote-1',
            agendaItemId: agendaItemId,
            title: 'Policy Change Vote',
            description: 'Vote on new policy change',
            options: ['Yes', 'No', 'Abstain'],
            status: 'completed',
            requiredVotingPower: 'simple-majority',
            createdAt: new Date().toISOString()
          }
        ]
        break
        
      case 'getVotingResults':
        // Get voting results for a specific vote
        if (!voteId) {
          return NextResponse.json({ error: 'voteId parameter is required for getVotingResults action' }, { status: 400 })
        }
        // In a real implementation, this would calculate and return voting results
        // For now, we'll return mock results
        result = {
          voteId,
          totalVotes: 15,
          results: {
            'Yes': 8,
            'No': 4,
            'Abstain': 3
          },
          status: 'completed',
          requiredVotingPower: 'simple-majority',
          outcome: 'Passed'
        }
        break
        
      case 'getUserVotingPatterns':
        // Get voting patterns for a user (requires admin access)
        const userPermissions = await accessControlService.getUserPermissions(user)
        if (userPermissions.accessLevel !== 'Admin') {
          return NextResponse.json({ error: 'Access denied - admin required for voting patterns' }, { status: 403 })
        }
        
        // Log the access to sensitive voting data
        await auditService.createAuditEvent(
          'voting.patterns.accessed',
          user.upn,
          {
            accessedBy: user.oid,
            accessedUserId: body.userId || user.oid
          },
          'access_voting_patterns_' + user.oid + '_' + Date.now(),
          'unite-voting'
        )
        
        // In a real implementation, this would return the user's voting patterns
        // For now, we'll return mock data
        result = {
          userId: body.userId || user.oid,
          votingHistory: [
            { voteId: 'vote-1', decision: 'Yes', timestamp: new Date().toISOString() },
            { voteId: 'vote-2', decision: 'No', timestamp: new Date().toISOString() },
            { voteId: 'vote-3', decision: 'Abstain', timestamp: new Date().toISOString() }
          ]
        }
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log the access for audit trail
    await auditService.createAuditEvent(
      'voting.accessed',
      user.upn,
      {
        action,
        voteId,
        meetingId,
        agendaItemId,
        userId: user.oid
      },
      'access_voting_' + action + '_' + (voteId || meetingId || agendaItemId) + '_' + Date.now(),
      'unite-voting'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Voting API GET error:', error)

    // Return user-friendly error for validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Don't leak implementation details for other errors
    return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
  }
}
