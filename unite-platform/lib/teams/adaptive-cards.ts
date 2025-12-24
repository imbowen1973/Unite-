// Teams Adaptive Card Service for Unite Platform
import { TokenPayload } from '@/lib/auth';
import { SharePointService } from '@/lib/sharepoint';
import { AuditService } from '@/lib/audit';
import { Meeting, AgendaItem } from '@/types/meeting';

export interface TeamsCardPayload {
  $schema: string;
  type: string;
  version: string;
  fallbackText: string;
  body: any[];
  actions?: any[];
}

export interface VoteSubmission {
  userId: string;
  userName: string;
  vote: 'Yes' | 'No' | 'Abstain';
  timestamp: string;
  meetingId: string;
  agendaItemId: string;
}

export class TeamsAdaptiveCardService {
  private sharepointService: SharePointService;
  private auditService: AuditService;

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService;
    this.auditService = auditService;
  }

  // Create an agenda item card for Teams chat
  createAgendaCard(meeting: Meeting, agendaItem: AgendaItem): TeamsCardPayload {
    return {
      '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
      'type': 'AdaptiveCard',
      'version': '1.2',
      'fallbackText': 'Agenda update',
      'body': [
        { 
          'type': 'TextBlock', 
          'text': 'Now discussing', 
          'weight': 'Bolder', 
          'size': 'Medium' 
        },
        { 
          'type': 'TextBlock', 
          'text': `${agendaItem.itemOrder}: ${agendaItem.title}`, 
          'wrap': true 
        },
        {
          'type': 'FactSet',
          'facts': [
            { 'title': 'Status', 'value': agendaItem.status.charAt(0).toUpperCase() + agendaItem.status.slice(1) },
            { 'title': 'Presenter', 'value': agendaItem.presenter || 'TBD' },
            { 'title': 'Time Allocation', 'value': `${agendaItem.timeAllocation} min` }
          ]
        }
      ],
      'actions': [
        {
          'type': 'Action.OpenUrl',
          'title': 'Open agenda item',
          'url': `https://your-app.example/teams/agenda?itemId=${agendaItem.id}`
        },
        {
          'type': 'Action.OpenUrl',
          'title': 'Open supporting documents',
          'url': this.getSupportingDocumentsUrl(agendaItem)
        }
      ]
    };
  }

  // Create a voting card for Teams chat (requires bot to handle submissions)
  createVotingCard(
    meeting: Meeting, 
    agendaItem: AgendaItem, 
    voteOptions: string[] = ['Yes', 'No', 'Abstain']
  ): TeamsCardPayload {
    const card: TeamsCardPayload = {
      '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
      'type': 'AdaptiveCard',
      'version': '1.2',
      'fallbackText': 'Vote required',
      'body': [
        { 
          'type': 'TextBlock', 
          'text': 'Board vote', 
          'weight': 'Bolder', 
          'size': 'Medium' 
        },
        { 
          'type': 'TextBlock', 
          'text': `${agendaItem.title}`, 
          'wrap': true 
        },
        {
          'type': 'TextBlock',
          'text': agendaItem.description,
          'wrap': true
        },
        {
          'type': 'TextBlock',
          'text': `Voting closes at ${this.getVotingCloseTime()}`,
          'isSubtle': true,
          'wrap': true
        }
      ],
      'actions': []
    };

    // Add vote options as submit actions
    for (const option of voteOptions) {
      card.actions?.push({
        'type': 'Action.Submit',
        'title': option,
        'data': {
          'kind': 'castVote',
          'meetingId': meeting.id,
          'agendaItemId': agendaItem.id,
          'vote': option
        }
      });
    }

    // Add a link to view motion details
    card.actions?.push({
      'type': 'Action.OpenUrl',
      'title': 'View motion details',
      'url': `https://your-app.example/teams/motions/${agendaItem.id}`
    });

    return card;
  }

  // Create a voting results card for Teams chat
  createResultsCard(
    meeting: Meeting, 
    agendaItem: AgendaItem, 
    results: { yes: number; no: number; abstain: number; total: number },
    closedAt: string
  ): TeamsCardPayload {
    return {
      '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
      'type': 'AdaptiveCard',
      'version': '1.2',
      'fallbackText': 'Vote result',
      'body': [
        { 
          'type': 'TextBlock', 
          'text': 'Vote closed', 
          'weight': 'Bolder', 
          'size': 'Medium' 
        },
        { 
          'type': 'TextBlock', 
          'text': `${agendaItem.title}: ${this.getVoteOutcome(results)}`, 
          'wrap': true 
        },
        {
          'type': 'FactSet',
          'facts': [
            { 'title': 'Yes', 'value': results.yes.toString() },
            { 'title': 'No', 'value': results.no.toString() },
            { 'title': 'Abstain', 'value': results.abstain.toString() },
            { 'title': 'Total', 'value': results.total.toString() },
            { 'title': 'Closed at', 'value': new Date(closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]
        }
      ],
      'actions': [
        {
          'type': 'Action.OpenUrl',
          'title': 'Open audit record',
          'url': `https://your-app.example/teams/motions/${agendaItem.id}#audit`
        }
      ]
    };
  }

  // Post an adaptive card to a Teams meeting chat using Microsoft Graph
  async postCardToMeetingChat(
    user: TokenPayload,
    meetingId: string,
    card: TeamsCardPayload,
    messageSubject?: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would call Microsoft Graph API to post to the meeting chat
      // POST /chats/{chat-id}/messages with the adaptive card as an attachment
      
      // Log the action in audit trail
      await this.auditService.createAuditEvent(
        'teams_card.posted',
        user.upn,
        {
          meetingId,
          cardType: card.fallbackText,
          postedBy: user.oid
        },
        `post_teams_card_${meetingId}_${Date.now()}`,
        'teams-integration'
      );

      return true;
    } catch (error) {
      console.error('Error posting card to Teams chat:', error);
      return false;
    }
  }

  // Process a vote submission from Teams
  async processVoteSubmission(
    user: TokenPayload,
    meetingId: string,
    agendaItemId: string,
    vote: 'Yes' | 'No' | 'Abstain'
  ): Promise<boolean> {
    try {
      // Check if user is authorized to vote in this meeting
      const meeting = await this.getMeeting(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Check if the user is an attendee of the meeting
      if (!meeting.attendees.includes(user.oid)) {
        throw new Error('User is not an attendee of this meeting');
      }

      // Check if the agenda item allows voting
      const agendaItem = await this.getAgendaItem(agendaItemId);
      if (!agendaItem || agendaItem.voteRequired === 'none') {
        throw new Error('This agenda item does not require voting');
      }

      // Record the vote
      const voteRecord: VoteSubmission = {
        userId: user.oid,
        userName: user.name || user.upn,
        vote,
        timestamp: new Date().toISOString(),
        meetingId,
        agendaItemId
      };

      // Store the vote in SharePoint
      await this.sharepointService.addListItem('voteSubmissionsListId', {
        Id: this.generateId(),
        MeetingId: meetingId,
        AgendaItemId: agendaItemId,
        UserId: user.oid,
        UserName: voteRecord.userName,
        Vote: vote,
        Timestamp: voteRecord.timestamp
      });

      // Log the vote in audit trail
      await this.auditService.createAuditEvent(
        'vote.submitted',
        user.upn,
        {
          meetingId,
          agendaItemId,
          vote,
          submittedBy: user.oid
        },
        `vote_submission_${agendaItemId}_${user.oid}_${Date.now()}`,
        'voting'
      );

      return true;
    } catch (error) {
      console.error('Error processing vote submission:', error);
      return false;
    }
  }

  // Get voting results for an agenda item
  async getVotingResults(agendaItemId: string): Promise<{ yes: number; no: number; abstain: number; total: number }> {
    try {
      // Get all votes for this agenda item
      const votesList = await this.sharepointService.getListItems('voteSubmissionsListId');
      const votes = votesList.filter(item => item.fields.AgendaItemId === agendaItemId);

      // Count the votes
      const results = { yes: 0, no: 0, abstain: 0, total: 0 };
      
      for (const voteItem of votes) {
        switch (voteItem.fields.Vote) {
          case 'Yes':
            results.yes++;
            break;
          case 'No':
            results.no++;
            break;
          case 'Abstain':
            results.abstain++;
            break;
        }
        results.total++;
      }

      return results;
    } catch (error) {
      console.error('Error getting voting results:', error);
      return { yes: 0, no: 0, abstain: 0, total: 0 };
    }
  }

  // Helper method to get supporting documents URL
  private getSupportingDocumentsUrl(agendaItem: AgendaItem): string {
    if (agendaItem.supportingDocuments && agendaItem.supportingDocuments.length > 0) {
      // In a real implementation, this would create a link to the supporting documents
      return `https://contoso.sharepoint.com/sites/Board/Shared%20Documents/Agenda-${agendaItem.id}`;
    }
    return '';
  }

  // Helper method to get voting close time (e.g., 15 minutes from now)
  private getVotingCloseTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15); // Default: close in 15 minutes
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Helper method to determine vote outcome
  private getVoteOutcome(results: { yes: number; no: number; abstain: number; total: number }): string {
    // Simple majority: if yes votes are more than half of total votes (excluding abstains)
    const nonAbstainVotes = results.yes + results.no;
    if (nonAbstainVotes === 0) {
      return 'No votes cast';
    }
    
    if (results.yes > nonAbstainVotes / 2) {
      return 'Passed';
    } else {
      return 'Failed';
    }
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // Placeholder for getting meeting by ID (would be implemented with actual meeting service)
  private async getMeeting(meetingId: string): Promise<Meeting | null> {
    // In a real implementation, this would fetch from the meeting service
    return null;
  }

  // Placeholder for getting agenda item by ID (would be implemented with actual meeting service)
  private async getAgendaItem(agendaItemId: string): Promise<AgendaItem | null> {
    // In a real implementation, this would fetch from the meeting service
    return null;
  }
}
