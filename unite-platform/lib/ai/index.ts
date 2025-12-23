// AI Processing Service for Unite Platform
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

export interface TranscriptSegment {
  speaker: string
  timestamp: string
  text: string
}

export interface MeetingSummary {
  summary: string
  keyOutcomes: string[]
  actionItems: ActionItem[]
  decisions: string[]
  topicsDiscussed: string[]
}

export interface ActionItem {
  id: string
  title: string
  description: string
  assignedTo: string[]
  dueDate?: string
  completionCriteria?: string
  priority: 'low' | 'medium' | 'high'
}

export class AIProcessingService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  // Process Teams transcript and extract key information
  async processTranscript(
    user: TokenPayload,
    meetingId: string,
    transcript: string
  ): Promise<MeetingSummary> {
    // Log the transcript processing
    await this.auditService.createAuditEvent(
      'ai.transcript_processing_started',
      user.upn,
      {
        meetingId,
        transcriptLength: transcript.length,
        userId: user.oid
      },
      'process_transcript_' + meetingId + '_' + Date.now(),
      'unite-ai'
    )

    try {
      // Parse the transcript into segments
      const segments = this.parseTranscript(transcript)
      
      // Generate summary using AI techniques
      const summary = this.generateSummary(segments)
      
      // Extract key outcomes
      const keyOutcomes = this.extractKeyOutcomes(segments)
      
      // Extract action items
      const actionItems = this.extractActionItems(segments, meetingId)
      
      // Extract decisions
      const decisions = this.extractDecisions(segments)
      
      // Extract topics discussed
      const topicsDiscussed = this.extractTopics(segments)

      const result: MeetingSummary = {
        summary,
        keyOutcomes,
        actionItems,
        decisions,
        topicsDiscussed
      }

      // Log the successful processing
      await this.auditService.createAuditEvent(
        'ai.transcript_processing_completed',
        user.upn,
        {
          meetingId,
          summaryLength: summary.length,
          actionItemCount: actionItems.length,
          outcomeCount: keyOutcomes.length
        },
        'process_transcript_complete_' + meetingId + '_' + Date.now(),
        'unite-ai'
      )

      return result
    } catch (error) {
      // Log the processing error
      await this.auditService.createAuditEvent(
        'ai.transcript_processing_failed',
        user.upn,
        {
          meetingId,
          error: (error as Error).message
        },
        'process_transcript_error_' + meetingId + '_' + Date.now(),
        'unite-ai'
      )

      throw error
    }
  }

  // Parse transcript into segments
  private parseTranscript(transcript: string): TranscriptSegment[] {
    // This would use a more sophisticated parsing algorithm in a real implementation
    // For now, we'll use a simple regex-based approach
    const lines = transcript.split(/\r?\n/)
    const segments: TranscriptSegment[] = []
    
    for (const line of lines) {
      // Simple pattern: [timestamp] Speaker: Message
      const match = line.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/)
      if (match) {
        segments.push({
          speaker: match[2],
          timestamp: match[1],
          text: match[3]
        })
      }
    }
    
    return segments
  }

  // Generate meeting summary
  private generateSummary(segments: TranscriptSegment[]): string {
    // In a real implementation, this would use a more sophisticated summarization algorithm
    // For now, we'll create a simple summary based on key phrases
    const text = segments.map(s => s.text).join(' ')
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Identify key sentences that contain important phrases
    const importantPhrases = [
      'decision', 'action', 'task', 'next step', 'follow up', 
      'important', 'critical', 'required', 'must', 'should'
    ]
    
    const keySentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase()
      return importantPhrases.some(phrase => lower.includes(phrase))
    })
    
    // Take up to 3 key sentences for the summary
    const summarySentences = keySentences.slice(0, 3)
    
    return summarySentences.join('. ') + '.'
  }

  // Extract key outcomes
  private extractKeyOutcomes(segments: TranscriptSegment[]): string[] {
    const outcomes: string[] = []
    const outcomePhrases = [
      'agreed to', 'decided', 'resolved', 'concluded', 
      'outcome', 'result', 'achieved', 'accomplished'
    ]
    
    for (const segment of segments) {
      const text = segment.text.toLowerCase()
      if (outcomePhrases.some(phrase => text.includes(phrase))) {
        outcomes.push(segment.text)
      }
    }
    
    return outcomes.slice(0, 5) // Return up to 5 outcomes
  }

  // Extract action items from transcript
  private extractActionItems(segments: TranscriptSegment[], meetingId: string): ActionItem[] {
    const actionItems: ActionItem[] = []
    const actionPhrases = [
      'action item', 'to do', 'task', 'assignment', 'responsible', 
      'will do', 'needs to', 'should', 'must', 'assigned to'
    ]
    
    for (const segment of segments) {
      const text = segment.text.toLowerCase()
      if (actionPhrases.some(phrase => text.includes(phrase))) {
        // Extract potential assignee from the speaker or context
        const assignee = segment.speaker || 'unassigned'
        
        actionItems.push({
          id: this.generateId(),
          title: segment.text.substring(0, 50) + '...',
          description: segment.text,
          assignedTo: [assignee], // In a real system, this would parse the actual assignees
          priority: this.estimatePriority(segment.text),
          dueDate: this.estimateDueDate(segment.text)
        })
      }
    }
    
    return actionItems.slice(0, 10) // Return up to 10 action items
  }

  // Extract decisions
  private extractDecisions(segments: TranscriptSegment[]): string[] {
    const decisions: string[] = []
    const decisionPhrases = [
      'decided', 'decision', 'resolved', 'agreed', 'approved', 
      'accepted', 'confirmed', 'ratified', 'authorized'
    ]
    
    for (const segment of segments) {
      const text = segment.text.toLowerCase()
      if (decisionPhrases.some(phrase => text.includes(phrase))) {
        decisions.push(segment.text)
      }
    }
    
    return decisions.slice(0, 5) // Return up to 5 decisions
  }

  // Extract topics discussed
  private extractTopics(segments: TranscriptSegment[]): string[] {
    // This would use NLP techniques to identify topics in a real implementation
    // For now, we'll extract sentences that seem to introduce topics
    const topics: string[] = []
    const topicIndicators = [
      'regarding', 'about', 'concerning', 'topic', 'subject', 'matter',
      'discussion', 'talking about', 'we need to discuss'
    ]
    
    for (const segment of segments) {
      const text = segment.text.toLowerCase()
      if (topicIndicators.some(indicator => text.includes(indicator))) {
        topics.push(segment.text)
      }
    }
    
    // Also include any sentences with important keywords
    const importantKeywords = ['policy', 'procedure', 'strategy', 'plan', 'report', 'review']
    for (const segment of segments) {
      const text = segment.text.toLowerCase()
      if (importantKeywords.some(keyword => text.includes(keyword))) {
        if (!topics.includes(segment.text)) {
          topics.push(segment.text)
        }
      }
    }
    
    return [...new Set(topics)].slice(0, 10) // Return unique topics, up to 10
  }

  // Estimate priority based on keywords
  private estimatePriority(text: string): 'low' | 'medium' | 'high' {
    const highPriorityWords = ['urgent', 'immediate', 'critical', 'asap', 'emergency', 'crisis']
    const mediumPriorityWords = ['important', 'needed', 'required', 'should', 'must']
    
    const lowerText = text.toLowerCase()
    
    if (highPriorityWords.some(word => lowerText.includes(word))) {
      return 'high'
    } else if (mediumPriorityWords.some(word => lowerText.includes(word))) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  // Estimate due date based on text
  private estimateDueDate(text: string): string | undefined {
    // Look for date patterns in the text
    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
    const match = text.match(dateRegex)
    
    if (match) {
      // Validate and return the date
      const dateStr = match[0]
      // Simple validation - in a real system, this would be more robust
      if (this.isValidDate(dateStr)) {
        return dateStr
      }
    }
    
    // If no explicit date, estimate based on keywords
    if (text.toLowerCase().includes('today')) {
      return new Date().toISOString().split('T')[0]
    } else if (text.toLowerCase().includes('week')) {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek.toISOString().split('T')[0]
    } else if (text.toLowerCase().includes('month')) {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth.toISOString().split('T')[0]
    }
    
    return undefined
  }

  // Validate if a string is a valid date
  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr)
    return date instanceof Date && !isNaN(date.getTime())
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }
}
