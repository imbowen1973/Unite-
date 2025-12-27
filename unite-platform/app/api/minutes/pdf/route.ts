import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { MinutesPDFGenerator, PDFGenerationOptions } from '@/lib/meeting/pdf-generator'
import { MinutesService } from '@/lib/meeting/minutes-service'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

/**
 * PDF Generation API for Meeting Minutes
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
    const { minutesId, options } = body

    if (!minutesId) {
      return NextResponse.json(
        { error: 'Missing required field: minutesId' },
        { status: 400 }
      )
    }

    // Initialize services
    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const minutesService = new MinutesService(sharepointService, auditService)
    const pdfGenerator = new MinutesPDFGenerator(sharepointService, auditService)

    // Get minute items
    const minutes = await minutesService.getMeetingMinutes(minutesId)
    if (!minutes) {
      return NextResponse.json(
        { error: 'Meeting minutes not found' },
        { status: 404 }
      )
    }

    const minuteItems = await minutesService.getMinuteItemsForMeeting(minutes.meetingId)

    // Generate PDF
    const pdfOptions: PDFGenerationOptions = {
      includeTranscriptSegments: options?.includeTranscriptSegments || false,
      includeConfidenceScores: options?.includeConfidenceScores || false,
      includeActions: options?.includeActions !== false, // Default true
      includeVotingResults: options?.includeVotingResults !== false, // Default true
      format: options?.format || 'standard',
      letterhead: options?.letterhead !== false, // Default true
      watermark: options?.watermark,
    }

    const { pdfUrl, pdfPath } = await pdfGenerator.generatePDF(
      user,
      minutesId,
      minuteItems,
      pdfOptions
    )

    return NextResponse.json({
      success: true,
      pdfUrl,
      pdfPath,
      message: 'PDF generated successfully',
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
