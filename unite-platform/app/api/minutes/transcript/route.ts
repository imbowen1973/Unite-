import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { MeetingTranscript, TranscriptSegment } from '@/types/meeting'
import { randomUUID } from 'crypto'

/**
 * Transcript Upload API
 * Handles upload and parsing of meeting transcripts
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

    // Parse multipart form data
    const formData = await request.formData()
    const transcriptFile = formData.get('transcript') as File
    const meetingId = formData.get('meetingId') as string

    if (!transcriptFile || !meetingId) {
      return NextResponse.json(
        { error: 'Missing required fields: transcript file and meetingId' },
        { status: 400 }
      )
    }

    // Read transcript file
    const transcriptText = await transcriptFile.text()

    // Detect transcript format
    const transcriptFormat = detectTranscriptFormat(transcriptFile.name, transcriptText)

    // Parse transcript into segments (if applicable)
    const segments = parseTranscriptSegments(transcriptText, transcriptFormat)

    // Create transcript record
    const transcriptId = randomUUID()
    const transcript: MeetingTranscript = {
      id: transcriptId,
      meetingId,
      transcriptText,
      transcriptFormat,
      segments,
      uploadedBy: user.upn,
      uploadedAt: new Date().toISOString(),
      processingStatus: 'pending',
    }

    // Initialize services
    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)

    // Save to SharePoint
    await sharepointService.addListItem('transcriptsListId', {
      Id: transcriptId,
      MeetingId: meetingId,
      TranscriptText: transcriptText,
      TranscriptFormat: transcriptFormat,
      Segments: segments ? JSON.stringify(segments) : '',
      UploadedBy: user.upn,
      UploadedAt: transcript.uploadedAt,
      ProcessingStatus: 'pending',
    })

    // Audit
    await auditService.createAuditEvent(
      'meeting.transcript_uploaded',
      user.upn,
      {
        transcriptId,
        meetingId,
        format: transcriptFormat,
        segmentCount: segments?.length || 0,
      },
      `upload_transcript_${transcriptId}`,
      'unite-meetings'
    )

    return NextResponse.json({
      success: true,
      transcriptId,
      format: transcriptFormat,
      segmentCount: segments?.length || 0,
      message: 'Transcript uploaded successfully',
    })
  } catch (error) {
    console.error('Transcript upload error:', error)
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
 * Detect transcript format from filename and content
 */
function detectTranscriptFormat(
  filename: string,
  content: string
): 'plain' | 'vtt' | 'srt' | 'json' {
  const extension = filename.split('.').pop()?.toLowerCase()

  if (extension === 'vtt' || content.startsWith('WEBVTT')) {
    return 'vtt'
  } else if (extension === 'srt' || content.match(/^\d+\n\d{2}:\d{2}:\d{2}/)) {
    return 'srt'
  } else if (extension === 'json' || (content.startsWith('{') || content.startsWith('['))) {
    return 'json'
  }

  return 'plain'
}

/**
 * Parse transcript into timestamped segments
 */
function parseTranscriptSegments(
  content: string,
  format: 'plain' | 'vtt' | 'srt' | 'json'
): TranscriptSegment[] | undefined {
  switch (format) {
    case 'vtt':
      return parseVTT(content)
    case 'srt':
      return parseSRT(content)
    case 'json':
      return parseJSON(content)
    default:
      return undefined // Plain text has no segments
  }
}

/**
 * Parse WebVTT format
 */
function parseVTT(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // Look for timestamp line (e.g., "00:00:15.000 --> 00:00:18.000")
    const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/)
    if (timestampMatch) {
      const startTime = timestampMatch[1]
      const endTime = timestampMatch[2]

      // Get text (next lines until empty line)
      i++
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim())
        i++
      }

      const text = textLines.join(' ')

      // Extract speaker if present (format: "Speaker Name: text")
      const speakerMatch = text.match(/^([^:]+):\s*(.*)/)
      const speaker = speakerMatch ? speakerMatch[1] : undefined
      const segmentText = speakerMatch ? speakerMatch[2] : text

      segments.push({
        startTime: formatTimestamp(startTime),
        endTime: formatTimestamp(endTime),
        speaker,
        text: segmentText,
      })
    }

    i++
  }

  return segments
}

/**
 * Parse SRT format
 */
function parseSRT(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  const blocks = content.split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // Line 0: Index (ignore)
    // Line 1: Timestamp (e.g., "00:00:15,000 --> 00:00:18,000")
    // Line 2+: Text

    const timestampMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/)
    if (timestampMatch) {
      const startTime = timestampMatch[1].replace(',', '.')
      const endTime = timestampMatch[2].replace(',', '.')

      const text = lines.slice(2).join(' ')

      // Extract speaker if present
      const speakerMatch = text.match(/^([^:]+):\s*(.*)/)
      const speaker = speakerMatch ? speakerMatch[1] : undefined
      const segmentText = speakerMatch ? speakerMatch[2] : text

      segments.push({
        startTime: formatTimestamp(startTime),
        endTime: formatTimestamp(endTime),
        speaker,
        text: segmentText,
      })
    }
  }

  return segments
}

/**
 * Parse JSON format (e.g., Teams/Zoom transcript exports)
 */
function parseJSON(content: string): TranscriptSegment[] {
  try {
    const data = JSON.parse(content)

    // Handle different JSON structures
    if (Array.isArray(data)) {
      // Array of segments
      return data.map(item => ({
        startTime: formatTimestamp(item.startTime || item.start || '00:00:00'),
        endTime: formatTimestamp(item.endTime || item.end || '00:00:00'),
        speaker: item.speaker || item.name,
        text: item.text || item.content || '',
      }))
    } else if (data.segments || data.transcripts) {
      // Object with segments array
      const segments = data.segments || data.transcripts
      return segments.map((item: any) => ({
        startTime: formatTimestamp(item.startTime || item.start || '00:00:00'),
        endTime: formatTimestamp(item.endTime || item.end || '00:00:00'),
        speaker: item.speaker || item.name,
        text: item.text || item.content || '',
      }))
    }

    return []
  } catch (error) {
    console.error('Failed to parse JSON transcript:', error)
    return []
  }
}

/**
 * Format timestamp to consistent format (HH:MM:SS)
 */
function formatTimestamp(timestamp: string): string {
  // Remove milliseconds if present
  return timestamp.split('.')[0]
}
