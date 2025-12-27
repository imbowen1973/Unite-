import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { MeetingTemplateService } from '@/lib/meeting/template-service'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { MeetingManagementService } from '@/lib/meeting'
import { MeetingTemplateItem } from '@/types/meeting-template'

/**
 * Meeting Templates API
 *
 * Actions:
 * - create: Create new template
 * - update: Update existing template
 * - delete: Delete template (soft delete)
 * - clone: Clone template
 * - getByCommittee: Get templates for committee
 * - getById: Get single template
 * - createMeetingFromTemplate: Create meeting from template
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
    const templateService = new MeetingTemplateService(sharepointService, auditService)

    switch (action) {
      case 'create': {
        const { name, description, committee, category, items } = body

        if (!name || !committee || !category || !items) {
          return NextResponse.json(
            { error: 'Missing required fields: name, committee, category, items' },
            { status: 400 }
          )
        }

        const template = await templateService.createTemplate(
          user,
          name,
          description,
          committee,
          category,
          items as MeetingTemplateItem[]
        )

        return NextResponse.json({
          success: true,
          template,
        })
      }

      case 'update': {
        const { templateId, updates } = body

        if (!templateId || !updates) {
          return NextResponse.json(
            { error: 'Missing required fields: templateId, updates' },
            { status: 400 }
          )
        }

        const template = await templateService.updateTemplate(user, templateId, updates)

        return NextResponse.json({
          success: true,
          template,
        })
      }

      case 'delete': {
        const { templateId } = body

        if (!templateId) {
          return NextResponse.json(
            { error: 'Missing required field: templateId' },
            { status: 400 }
          )
        }

        await templateService.deleteTemplate(user, templateId)

        return NextResponse.json({
          success: true,
          message: 'Template deleted successfully',
        })
      }

      case 'clone': {
        const { templateId, newName } = body

        if (!templateId || !newName) {
          return NextResponse.json(
            { error: 'Missing required fields: templateId, newName' },
            { status: 400 }
          )
        }

        const template = await templateService.cloneTemplate(user, templateId, newName)

        return NextResponse.json({
          success: true,
          template,
        })
      }

      case 'getByCommittee': {
        const { committee } = body

        if (!committee) {
          return NextResponse.json(
            { error: 'Missing required field: committee' },
            { status: 400 }
          )
        }

        const templates = await templateService.getTemplatesForCommittee(committee)

        return NextResponse.json({
          success: true,
          templates,
        })
      }

      case 'getById': {
        const { templateId } = body

        if (!templateId) {
          return NextResponse.json(
            { error: 'Missing required field: templateId' },
            { status: 400 }
          )
        }

        const template = await templateService.getTemplate(templateId)

        if (!template) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          template,
        })
      }

      case 'createMeetingFromTemplate': {
        const { templateId, title, scheduledDate, startTime, customItems, attendees } = body

        if (!templateId || !title || !scheduledDate) {
          return NextResponse.json(
            { error: 'Missing required fields: templateId, title, scheduledDate' },
            { status: 400 }
          )
        }

        // Initialize meeting management service
        const meetingService = new MeetingManagementService(sharepointService, auditService)

        const result = await templateService.createMeetingFromTemplate(
          user,
          {
            templateId,
            title,
            scheduledDate,
            startTime,
            customItems,
            attendees,
          },
          meetingService
        )

        return NextResponse.json({
          success: true,
          meetingId: result.meetingId,
          agendaItems: result.agendaItems,
          message: `Meeting created from template with ${result.agendaItems.length} agenda items`,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Meeting templates API error:', error)
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
 * GET endpoint for fetching templates
 * Query params:
 * - committee: Filter by committee
 * - id: Get specific template
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
    const committee = searchParams.get('committee')
    const templateId = searchParams.get('id')

    // Initialize services
    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const templateService = new MeetingTemplateService(sharepointService, auditService)

    if (templateId) {
      // Get specific template
      const template = await templateService.getTemplate(templateId)

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        template,
      })
    } else if (committee) {
      // Get templates for committee
      const templates = await templateService.getTemplatesForCommittee(committee)

      return NextResponse.json({
        success: true,
        templates,
      })
    } else {
      // Get all active templates
      const sharepointResponse = await sharepointService.getListItems('meetingTemplatesListId', {
        filter: "IsActive eq true",
        select: ['Id', 'Name', 'Description', 'Committee', 'Category', 'ItemsJSON', 'DefaultDuration', 'DefaultStartTime', 'DefaultLocation', 'DefaultAttendees', 'IsActive', 'Version', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'UsageCount', 'LastUsedAt'],
      })

      const templates = sharepointResponse.value.map((item: any) => ({
        id: item.Id,
        name: item.Name,
        description: item.Description || '',
        committee: item.Committee,
        category: item.Category,
        items: JSON.parse(item.ItemsJSON || '[]'),
        defaultDuration: item.DefaultDuration,
        defaultStartTime: item.DefaultStartTime,
        defaultLocation: item.DefaultLocation,
        defaultAttendees: item.DefaultAttendees ? item.DefaultAttendees.split(',') : [],
        isActive: item.IsActive,
        version: item.Version,
        createdAt: item.CreatedAt,
        createdBy: item.CreatedBy,
        updatedAt: item.UpdatedAt,
        updatedBy: item.UpdatedBy,
        usageCount: item.UsageCount || 0,
        lastUsedAt: item.LastUsedAt,
      }))

      return NextResponse.json({
        success: true,
        templates,
      })
    }
  } catch (error) {
    console.error('Meeting templates GET error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
