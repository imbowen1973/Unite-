// PDF Generator for Meeting Minutes
// Generates formatted PDF documents from meeting minutes

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import {
  MeetingMinutes,
  MinuteItem,
  AttendanceRecord,
} from '@/types/meeting'

/**
 * PDF generation options
 */
export interface PDFGenerationOptions {
  includeTranscriptSegments?: boolean
  includeConfidenceScores?: boolean
  includeActions?: boolean
  includeVotingResults?: boolean
  format?: 'standard' | 'formal' | 'compact'
  letterhead?: boolean
  watermark?: string
}

/**
 * HTML-based PDF generation
 * In production, this would use puppeteer or similar for server-side rendering
 */
export class MinutesPDFGenerator {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  /**
   * Generate PDF from meeting minutes
   */
  async generatePDF(
    user: TokenPayload,
    minutesId: string,
    minuteItems: MinuteItem[],
    options: PDFGenerationOptions = {}
  ): Promise<{ pdfUrl: string; pdfPath: string }> {
    // Get meeting minutes
    const minutes = await this.getMeetingMinutes(minutesId)
    if (!minutes) {
      throw new Error('Meeting minutes not found')
    }

    // Generate HTML content
    const html = this.generateHTML(minutes, minuteItems, options)

    // Convert HTML to PDF
    const { pdfPath, pdfUrl } = await this.convertHTMLToPDF(html, minutes.meetingTitle, options)

    // Update minutes record with PDF URL
    await this.sharepointService.updateListItem('meetingMinutesListId', minutesId, {
      PdfUrl: pdfUrl,
      PdfGeneratedAt: new Date().toISOString(),
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.pdf_generated',
      user.upn,
      {
        minutesId,
        meetingId: minutes.meetingId,
        pdfUrl,
      },
      `generate_pdf_${minutesId}`,
      'unite-meetings'
    )

    return { pdfUrl, pdfPath }
  }

  /**
   * Generate HTML content for PDF
   */
  private generateHTML(
    minutes: MeetingMinutes,
    minuteItems: MinuteItem[],
    options: PDFGenerationOptions
  ): string {
    const styles = this.getStyles(options.format || 'standard')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${minutes.meetingTitle} - Minutes</title>
  <style>${styles}</style>
</head>
<body>
  ${options.letterhead ? this.generateLetterhead() : ''}
  ${options.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}

  <div class="container">
    ${this.generateHeader(minutes)}
    ${this.generateAttendance(minutes)}
    ${this.generateMinuteItems(minuteItems, options)}
    ${this.generateFooter(minutes)}
  </div>
</body>
</html>
    `
  }

  /**
   * Generate header section
   */
  private generateHeader(minutes: MeetingMinutes): string {
    const meetingDate = new Date(minutes.meetingDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return `
    <div class="header">
      <h1>${minutes.meetingTitle}</h1>
      <div class="metadata">
        <div class="metadata-row">
          <span class="label">Committee:</span>
          <span class="value">${minutes.committee}</span>
        </div>
        <div class="metadata-row">
          <span class="label">Date:</span>
          <span class="value">${meetingDate}</span>
        </div>
        <div class="metadata-row">
          <span class="label">Time:</span>
          <span class="value">${this.formatTime(minutes.startTime)} - ${this.formatTime(minutes.endTime)}</span>
        </div>
        ${minutes.location ? `
        <div class="metadata-row">
          <span class="label">Location:</span>
          <span class="value">${minutes.location}</span>
        </div>
        ` : ''}
      </div>
    </div>
    `
  }

  /**
   * Generate attendance section
   */
  private generateAttendance(minutes: MeetingMinutes): string {
    const present = minutes.attendees.filter(a => a.status === 'present')
    const apologies = minutes.attendees.filter(a => a.status === 'apologies')
    const absent = minutes.attendees.filter(a => a.status === 'absent')

    return `
    <div class="attendance">
      <h2>Attendance</h2>

      ${present.length > 0 ? `
      <div class="attendance-section">
        <h3>Present:</h3>
        <ul class="attendance-list">
          ${present.map(a => `
            <li>
              ${a.displayName}${a.role ? ` (${a.role})` : ''}
              ${a.arrivedAt ? ` - <em>arrived ${this.formatTime(a.arrivedAt)}</em>` : ''}
              ${a.leftAt ? ` - <em>left ${this.formatTime(a.leftAt)}</em>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      ${apologies.length > 0 ? `
      <div class="attendance-section">
        <h3>Apologies:</h3>
        <ul class="attendance-list">
          ${apologies.map(a => `<li>${a.displayName}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${absent.length > 0 ? `
      <div class="attendance-section">
        <h3>Absent:</h3>
        <ul class="attendance-list">
          ${absent.map(a => `<li>${a.displayName}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    `
  }

  /**
   * Generate minute items section
   */
  private generateMinuteItems(minuteItems: MinuteItem[], options: PDFGenerationOptions): string {
    // Sort by orderPath
    const sorted = minuteItems.sort((a, b) => this.compareOrderPaths(a.orderPath, b.orderPath))

    return `
    <div class="minutes">
      <h2>Minutes</h2>
      ${sorted.map(item => this.generateMinuteItem(item, options)).join('\n')}
    </div>
    `
  }

  /**
   * Generate individual minute item
   */
  private generateMinuteItem(item: MinuteItem, options: PDFGenerationOptions): string {
    const indent = item.level * 20 // 20px per level

    return `
    <div class="minute-item" style="margin-left: ${indent}px;">
      <div class="minute-header">
        <span class="order-path">${item.orderPath}.</span>
        <span class="title">${item.agendaTitle}</span>
      </div>

      ${item.agendaPurpose ? `
      <div class="purpose">
        <em>${item.agendaPurpose}</em>
      </div>
      ` : ''}

      ${item.presenters && item.presenters.length > 0 ? `
      <div class="presenters">
        <strong>Presented by:</strong> ${item.presenters.join(', ')}
      </div>
      ` : ''}

      ${item.discussion ? `
      <div class="discussion">
        ${this.formatText(item.discussion)}
      </div>
      ` : ''}

      ${item.keyPoints && item.keyPoints.length > 0 ? `
      <div class="key-points">
        <strong>Key Points:</strong>
        <ul>
          ${item.keyPoints.map(point => `<li>${point}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${item.decision ? `
      <div class="decision">
        <strong>Decision:</strong> ${item.decision}
      </div>
      ` : ''}

      ${item.votingResult && options.includeVotingResults ? `
      <div class="voting-result">
        <strong>Voting Result:</strong> ${item.votingResult.outcome}<br>
        <em>For: ${item.votingResult.votesFor}, Against: ${item.votingResult.votesAgainst}, Abstentions: ${item.votingResult.abstentions}</em>
      </div>
      ` : ''}

      ${item.actions && item.actions.length > 0 && options.includeActions ? `
      <div class="actions">
        <strong>Actions:</strong>
        <ul class="actions-list">
          ${item.actions.map(actionId => `<li>Action #${actionId}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${item.transcriptSegment && options.includeTranscriptSegments ? `
      <div class="transcript-segment">
        <details>
          <summary>View transcript segment</summary>
          <div class="transcript-text">
            <small>${item.transcriptSegment.transcriptText}</small>
          </div>
        </details>
      </div>
      ` : ''}
    </div>
    `
  }

  /**
   * Generate footer section
   */
  private generateFooter(minutes: MeetingMinutes): string {
    return `
    <div class="footer">
      ${minutes.additionalNotes ? `
      <div class="additional-notes">
        <h3>Additional Notes</h3>
        <p>${this.formatText(minutes.additionalNotes)}</p>
      </div>
      ` : ''}

      ${minutes.nextMeetingDate ? `
      <div class="next-meeting">
        <strong>Next Meeting:</strong> ${new Date(minutes.nextMeetingDate).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
      ` : ''}

      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Chair</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Secretary</div>
        </div>
      </div>

      <div class="document-info">
        <p><small>
          Status: ${minutes.status.toUpperCase()}<br>
          ${minutes.approvedBy ? `Approved by: ${minutes.approvedBy} on ${new Date(minutes.approvedAt!).toLocaleDateString('en-GB')}<br>` : ''}
          Version: ${minutes.version}<br>
          Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}
        </small></p>
      </div>
    </div>
    `
  }

  /**
   * Get CSS styles based on format
   */
  private getStyles(format: 'standard' | 'formal' | 'compact'): string {
    const baseStyles = `
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
      }

      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80pt;
        opacity: 0.1;
        z-index: -1;
        color: #999;
      }

      .header {
        border-bottom: 3px solid #333;
        padding-bottom: 15px;
        margin-bottom: 30px;
      }

      .header h1 {
        margin: 0 0 15px 0;
        font-size: 24pt;
        color: #1a1a1a;
      }

      .metadata {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px;
      }

      .metadata-row {
        display: contents;
      }

      .metadata .label {
        font-weight: bold;
        padding-right: 10px;
      }

      .attendance {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .attendance h2 {
        font-size: 16pt;
        margin-bottom: 10px;
        border-bottom: 2px solid #666;
        padding-bottom: 5px;
      }

      .attendance h3 {
        font-size: 12pt;
        margin: 15px 0 5px 0;
      }

      .attendance-list {
        margin: 0;
        padding-left: 20px;
      }

      .attendance-list li {
        margin-bottom: 5px;
      }

      .minutes h2 {
        font-size: 16pt;
        margin-bottom: 15px;
        border-bottom: 2px solid #666;
        padding-bottom: 5px;
      }

      .minute-item {
        margin-bottom: 20px;
        page-break-inside: avoid;
      }

      .minute-header {
        font-size: 13pt;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .order-path {
        color: #666;
        margin-right: 5px;
      }

      .purpose {
        color: #666;
        margin-bottom: 8px;
        font-size: 10pt;
      }

      .presenters {
        margin-bottom: 8px;
        font-size: 10pt;
      }

      .discussion {
        margin-bottom: 10px;
        text-align: justify;
      }

      .key-points {
        margin-bottom: 10px;
        background: #f5f5f5;
        padding: 10px;
        border-left: 3px solid #666;
      }

      .key-points ul {
        margin: 5px 0 0 0;
        padding-left: 20px;
      }

      .decision {
        margin-bottom: 10px;
        background: #e8f5e9;
        padding: 10px;
        border-left: 3px solid #4caf50;
      }

      .voting-result {
        margin-bottom: 10px;
        background: #fff3e0;
        padding: 10px;
        border-left: 3px solid #ff9800;
      }

      .actions {
        margin-bottom: 10px;
      }

      .actions-list {
        margin: 5px 0 0 0;
        padding-left: 20px;
      }

      .transcript-segment {
        margin-top: 10px;
        font-size: 9pt;
      }

      .transcript-text {
        background: #f5f5f5;
        padding: 10px;
        margin-top: 5px;
        max-height: 200px;
        overflow-y: auto;
      }

      .footer {
        margin-top: 40px;
        page-break-before: avoid;
      }

      .additional-notes {
        margin-bottom: 30px;
      }

      .next-meeting {
        margin-bottom: 30px;
        font-size: 11pt;
      }

      .signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin: 40px 0;
      }

      .signature-block {
        text-align: center;
      }

      .signature-line {
        border-bottom: 1px solid #333;
        margin-bottom: 5px;
        height: 50px;
      }

      .signature-label {
        font-weight: bold;
      }

      .document-info {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ccc;
        text-align: center;
        color: #666;
      }

      @media print {
        body {
          margin: 0;
        }
        .container {
          padding: 15mm;
        }
      }
    `

    if (format === 'formal') {
      return baseStyles + `
        body { font-family: 'Times New Roman', Times, serif; }
        .header h1 { font-variant: small-caps; }
      `
    } else if (format === 'compact') {
      return baseStyles + `
        body { font-size: 10pt; line-height: 1.4; }
        .container { padding: 15mm; }
        .minute-item { margin-bottom: 15px; }
      `
    }

    return baseStyles
  }

  /**
   * Generate letterhead (customize per institution)
   */
  private generateLetterhead(): string {
    return `
    <div class="letterhead" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
      <div style="font-size: 20pt; font-weight: bold; color: #1a1a1a;">University Name</div>
      <div style="font-size: 10pt; color: #666;">Official Meeting Minutes</div>
    </div>
    `
  }

  /**
   * Convert HTML to PDF
   */
  private async convertHTMLToPDF(
    html: string,
    filename: string,
    options: PDFGenerationOptions
  ): Promise<{ pdfPath: string; pdfUrl: string }> {
    // In production, use puppeteer or similar for server-side rendering
    // For now, return mock data

    const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const timestamp = Date.now()
    const pdfPath = `/tmp/minutes_${sanitizedFilename}_${timestamp}.pdf`
    const pdfUrl = `/api/minutes/pdf/${sanitizedFilename}_${timestamp}.pdf`

    // TODO: Implement actual PDF generation using puppeteer or similar
    // Example with puppeteer:
    // const browser = await puppeteer.launch()
    // const page = await browser.newPage()
    // await page.setContent(html)
    // await page.pdf({ path: pdfPath, format: 'A4', printBackground: true })
    // await browser.close()

    return { pdfPath, pdfUrl }
  }

  // Helper methods
  private async getMeetingMinutes(minutesId: string): Promise<MeetingMinutes | null> {
    try {
      const item = await this.sharepointService.getListItem('meetingMinutesListId', minutesId)
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
    } catch (error) {
      return null
    }
  }

  private formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  private formatText(text: string): string {
    // Convert line breaks to HTML
    return text.replace(/\n/g, '<br>')
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
