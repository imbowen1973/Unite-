// Transcript Processor
// Uses LLM to extract discussion, actions, and decisions from meeting transcripts

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import {
  MeetingTranscript,
  AgendaItem,
  MinuteItem,
  TranscriptSegment,
} from '@/types/meeting'
import { randomUUID } from 'crypto'

/**
 * Configuration for AI model
 */
interface AIModelConfig {
  model: string
  temperature: number
  maxTokens: number
}

/**
 * Extracted discussion from transcript
 */
interface ExtractedDiscussion {
  agendaItemId: string
  discussion: string
  summary: string
  keyPoints: string[]
  suggestedActions: string[]
  decision?: string
  confidenceScore: number
  transcriptSegment: {
    startTime: string
    endTime: string
    transcriptText: string
  }
}

export class TranscriptProcessor {
  private sharepointService: SharePointService
  private auditService: AuditService
  private aiConfig: AIModelConfig

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    aiConfig?: AIModelConfig
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.aiConfig = aiConfig || {
      model: 'claude-opus-4-5',
      temperature: 0.3,
      maxTokens: 4096,
    }
  }

  /**
   * Process transcript and extract discussion for agenda items
   */
  async processTranscript(
    user: TokenPayload,
    meetingId: string,
    transcriptId: string,
    agendaItems: AgendaItem[]
  ): Promise<ExtractedDiscussion[]> {
    // Get transcript
    const transcript = await this.getTranscript(transcriptId)
    if (!transcript) {
      throw new Error('Transcript not found')
    }

    // Update status
    await this.updateTranscriptStatus(transcriptId, 'processing')

    const extractedDiscussions: ExtractedDiscussion[] = []

    try {
      // Process each agenda item (excluding breaks)
      for (const agendaItem of agendaItems.filter(item => item.role !== 'break')) {
        const extracted = await this.extractDiscussionForAgendaItem(
          transcript,
          agendaItem,
          agendaItems
        )

        extractedDiscussions.push(extracted)
      }

      // Update transcript with extraction results
      await this.sharepointService.updateListItem('transcriptsListId', transcriptId, {
        ProcessingStatus: 'completed',
        ProcessedAt: new Date().toISOString(),
        ExtractedMinutes: JSON.stringify(
          extractedDiscussions.map(ed => ({
            agendaItemId: ed.agendaItemId,
            extractedDiscussion: ed.discussion,
            confidenceScore: ed.confidenceScore,
            suggestedActions: ed.suggestedActions,
          }))
        ),
      })

      // Audit
      await this.auditService.createAuditEvent(
        'meeting.transcript_processed',
        user.upn,
        {
          meetingId,
          transcriptId,
          itemsProcessed: extractedDiscussions.length,
        },
        `process_transcript_${transcriptId}`,
        'unite-meetings'
      )

      return extractedDiscussions
    } catch (error) {
      // Update status to failed
      await this.updateTranscriptStatus(transcriptId, 'failed', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Extract discussion for a specific agenda item
   */
  private async extractDiscussionForAgendaItem(
    transcript: MeetingTranscript,
    agendaItem: AgendaItem,
    allAgendaItems: AgendaItem[]
  ): Promise<ExtractedDiscussion> {
    // Find relevant transcript segment based on timing
    const segment = this.findRelevantSegment(transcript, agendaItem)

    // Build prompt for LLM
    const prompt = this.buildExtractionPrompt(agendaItem, segment.text, allAgendaItems)

    // Call LLM to extract discussion
    const result = await this.callLLM(prompt)

    // Parse LLM response
    const parsed = this.parseLLMResponse(result)

    return {
      agendaItemId: agendaItem.id,
      discussion: parsed.discussion,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      suggestedActions: parsed.suggestedActions,
      decision: parsed.decision,
      confidenceScore: parsed.confidenceScore,
      transcriptSegment: {
        startTime: segment.startTime,
        endTime: segment.endTime,
        transcriptText: segment.text,
      },
    }
  }

  /**
   * Find relevant transcript segment for an agenda item
   */
  private findRelevantSegment(
    transcript: MeetingTranscript,
    agendaItem: AgendaItem
  ): { startTime: string; endTime: string; text: string } {
    // If transcript has timestamped segments, use agenda item times
    if (transcript.segments && agendaItem.startTime && agendaItem.endTime) {
      const startTime = new Date(agendaItem.startTime)
      const endTime = new Date(agendaItem.endTime)

      const relevantSegments = transcript.segments.filter(seg => {
        const segTime = this.parseTimestamp(seg.startTime)
        return segTime >= startTime && segTime <= endTime
      })

      if (relevantSegments.length > 0) {
        return {
          startTime: relevantSegments[0].startTime,
          endTime: relevantSegments[relevantSegments.length - 1].endTime,
          text: relevantSegments.map(seg => `[${seg.speaker || 'Speaker'}]: ${seg.text}`).join('\n'),
        }
      }
    }

    // Fallback: Use keyword matching to find relevant section
    const keywords = this.extractKeywords(agendaItem.title + ' ' + agendaItem.description)
    const transcriptText = transcript.transcriptText

    // Simple sliding window to find most relevant section
    const windowSize = 2000 // characters
    const bestMatch = this.findBestMatchingWindow(transcriptText, keywords, windowSize)

    return {
      startTime: '00:00:00',
      endTime: '00:00:00',
      text: bestMatch,
    }
  }

  /**
   * Build prompt for LLM to extract discussion
   */
  private buildExtractionPrompt(
    agendaItem: AgendaItem,
    transcriptSegment: string,
    allAgendaItems: AgendaItem[]
  ): string {
    return `You are extracting meeting minutes from a transcript for a specific agenda item.

**Agenda Item #${agendaItem.orderPath}: ${agendaItem.title}**
Purpose: ${agendaItem.description}
Role: ${agendaItem.role}
${agendaItem.presenter ? `Presenter: ${agendaItem.presenter}` : ''}

**Transcript Segment:**
${transcriptSegment}

**Instructions:**
1. Extract the main discussion points related to this agenda item
2. Write a clear, concise summary (2-3 sentences)
3. Identify 3-5 key points from the discussion
4. Identify any action items or tasks assigned
5. Identify any decisions made
6. Provide a confidence score (0-100) for how well the transcript matches this agenda item

**Output Format (JSON):**
{
  "discussion": "Full narrative of the discussion for this agenda item. Write in past tense, third person. Include who said what if relevant.",
  "summary": "Brief 2-3 sentence summary of the discussion and outcome",
  "keyPoints": [
    "First key point discussed",
    "Second key point discussed",
    "Third key point discussed"
  ],
  "suggestedActions": [
    "Action 1: Description [Assigned to: Name]",
    "Action 2: Description [Assigned to: Name]"
  ],
  "decision": "Final decision or outcome if applicable, otherwise null",
  "confidenceScore": 85
}

Extract the discussion for this agenda item now:`
  }

  /**
   * Call LLM API to extract discussion
   */
  private async callLLM(prompt: string): Promise<string> {
    // This is a placeholder for actual LLM API call
    // In production, this would call Claude API or similar

    try {
      // Example using Anthropic Claude API (adjust based on your setup)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.aiConfig.model,
          max_tokens: this.aiConfig.maxTokens,
          temperature: this.aiConfig.temperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.content[0].text
    } catch (error) {
      console.error('LLM call failed:', error)
      // Fallback: return empty result
      return JSON.stringify({
        discussion: 'Unable to extract discussion automatically. Please enter manually.',
        summary: '',
        keyPoints: [],
        suggestedActions: [],
        decision: null,
        confidenceScore: 0,
      })
    }
  }

  /**
   * Parse LLM response
   */
  private parseLLMResponse(response: string): {
    discussion: string
    summary: string
    keyPoints: string[]
    suggestedActions: string[]
    decision?: string
    confidenceScore: number
  } {
    try {
      // Extract JSON from response (handles cases where LLM adds text around JSON)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        discussion: parsed.discussion || '',
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        suggestedActions: parsed.suggestedActions || [],
        decision: parsed.decision,
        confidenceScore: parsed.confidenceScore || 0,
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error)
      return {
        discussion: 'Unable to parse extracted discussion. Please review manually.',
        summary: '',
        keyPoints: [],
        suggestedActions: [],
        confidenceScore: 0,
      }
    }
  }

  /**
   * Apply extracted discussions to minute items
   */
  async applyExtractedDiscussions(
    user: TokenPayload,
    meetingId: string,
    extractedDiscussions: ExtractedDiscussion[],
    minuteItems: MinuteItem[]
  ): Promise<MinuteItem[]> {
    const updatedItems: MinuteItem[] = []

    for (const extracted of extractedDiscussions) {
      const minuteItem = minuteItems.find(item => item.agendaItemId === extracted.agendaItemId)

      if (!minuteItem) {
        console.warn(`No minute item found for agenda item ${extracted.agendaItemId}`)
        continue
      }

      // Update minute item
      await this.sharepointService.updateListItem('minuteItemsListId', minuteItem.id, {
        Discussion: extracted.discussion,
        DiscussionSummary: extracted.summary,
        KeyPoints: JSON.stringify(extracted.keyPoints),
        Decision: extracted.decision || '',
        TranscriptSegment: JSON.stringify(extracted.transcriptSegment),
        UpdatedAt: new Date().toISOString(),
      })

      updatedItems.push({
        ...minuteItem,
        discussion: extracted.discussion,
        discussionSummary: extracted.summary,
        keyPoints: extracted.keyPoints,
        decision: extracted.decision,
        transcriptSegment: extracted.transcriptSegment,
      })
    }

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.discussions_applied',
      user.upn,
      {
        meetingId,
        itemsUpdated: updatedItems.length,
      },
      `apply_discussions_${meetingId}`,
      'unite-meetings'
    )

    return updatedItems
  }

  // Helper methods
  private async getTranscript(transcriptId: string): Promise<MeetingTranscript | null> {
    try {
      const item = await this.sharepointService.getListItem('transcriptsListId', transcriptId)
      return {
        id: item.Id,
        meetingId: item.MeetingId,
        recordingUrl: item.RecordingUrl,
        recordingDuration: item.RecordingDuration,
        transcriptText: item.TranscriptText,
        transcriptFormat: item.TranscriptFormat,
        segments: item.Segments ? JSON.parse(item.Segments) : undefined,
        speakers: item.Speakers ? JSON.parse(item.Speakers) : undefined,
        uploadedBy: item.UploadedBy,
        uploadedAt: item.UploadedAt,
        processedAt: item.ProcessedAt,
        processingStatus: item.ProcessingStatus,
        processingError: item.ProcessingError,
        extractedMinutes: item.ExtractedMinutes ? JSON.parse(item.ExtractedMinutes) : undefined,
      }
    } catch (error) {
      return null
    }
  }

  private async updateTranscriptStatus(
    transcriptId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const updates: any = {
      ProcessingStatus: status,
    }

    if (status === 'processing') {
      updates.ProcessedAt = null
    } else if (status === 'completed') {
      updates.ProcessedAt = new Date().toISOString()
    } else if (status === 'failed' && error) {
      updates.ProcessingError = error
    }

    await this.sharepointService.updateListItem('transcriptsListId', transcriptId, updates)
  }

  private parseTimestamp(timestamp: string): Date {
    // Parse timestamp like "00:15:30" or "15:30" to Date
    const parts = timestamp.split(':').map(Number)
    const date = new Date()
    date.setHours(0, 0, 0, 0)

    if (parts.length === 3) {
      date.setHours(parts[0], parts[1], parts[2])
    } else if (parts.length === 2) {
      date.setMinutes(parts[0], parts[1])
    }

    return date
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (in production, use NLP library)
    const words = text.toLowerCase().split(/\s+/)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'])

    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10)
  }

  private findBestMatchingWindow(
    text: string,
    keywords: string[],
    windowSize: number
  ): string {
    // Slide a window over text and find section with most keyword matches
    let bestScore = 0
    let bestWindow = text.substring(0, windowSize)

    for (let i = 0; i < text.length - windowSize; i += 100) {
      const window = text.substring(i, i + windowSize)
      const score = keywords.reduce((score, keyword) => {
        return score + (window.toLowerCase().includes(keyword) ? 1 : 0)
      }, 0)

      if (score > bestScore) {
        bestScore = score
        bestWindow = window
      }
    }

    return bestWindow
  }
}
