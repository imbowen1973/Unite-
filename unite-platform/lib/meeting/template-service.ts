// Meeting Template Service for Unite Platform
// Manages reusable meeting templates with standing items

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel } from '@/lib/access'
import {
  MeetingTemplate,
  MeetingTemplateItem,
  CreateMeetingFromTemplateRequest,
  MeetingFromTemplate,
  TemplateUsageStats,
} from '@/types/meeting-template'
import { AgendaItem } from '@/types/meeting'
import { randomUUID } from 'crypto'
import {
  calculateOrderPath,
  calculateLevel,
  sortAgendaItems,
} from './agenda-utils'

export class MeetingTemplateService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
  }

  /**
   * Create a new meeting template
   */
  async createTemplate(
    user: TokenPayload,
    name: string,
    description: string,
    committee: string,
    category: 'board' | 'committee' | 'working-group' | 'ad-hoc',
    items: MeetingTemplateItem[]
  ): Promise<MeetingTemplate> {
    // Check admin permissions
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (userPermissions.accessLevel !== AccessLevel.Admin && userPermissions.accessLevel !== AccessLevel.Executive) {
      throw new Error('Only administrators can create meeting templates')
    }

    const templateId = randomUUID()
    const now = new Date().toISOString()

    const template: MeetingTemplate = {
      id: templateId,
      name,
      description,
      committee,
      category,
      items,
      defaultDuration: this.calculateTotalDuration(items),
      isActive: true,
      version: '1.0',
      createdAt: now,
      createdBy: user.upn,
      updatedAt: now,
      updatedBy: user.upn,
      usageCount: 0,
    }

    // Store in SharePoint list as JSON
    await this.sharepointService.addListItem('meetingTemplatesListId', {
      Id: templateId,
      Name: name,
      Description: description,
      Committee: committee,
      Category: category,
      ItemsJSON: JSON.stringify(items),
      DefaultDuration: template.defaultDuration,
      IsActive: true,
      Version: '1.0',
      CreatedAt: now,
      CreatedBy: user.upn,
      UpdatedAt: now,
      UpdatedBy: user.upn,
      UsageCount: 0,
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting_template.created',
      user.upn,
      {
        templateId,
        name,
        committee,
        itemCount: items.length,
      },
      `create_template_${templateId}`,
      'unite-meetings'
    )

    return template
  }

  /**
   * Get all templates for a committee
   */
  async getTemplatesForCommittee(committee: string): Promise<MeetingTemplate[]> {
    const allTemplates = await this.sharepointService.getListItems('meetingTemplatesListId')
    const templates: MeetingTemplate[] = []

    for (const item of allTemplates) {
      if (item.fields.Committee === committee && item.fields.IsActive) {
        templates.push({
          id: item.fields.Id,
          name: item.fields.Name,
          description: item.fields.Description,
          committee: item.fields.Committee,
          category: item.fields.Category,
          items: JSON.parse(item.fields.ItemsJSON || '[]'),
          defaultDuration: item.fields.DefaultDuration,
          defaultStartTime: item.fields.DefaultStartTime,
          defaultLocation: item.fields.DefaultLocation,
          defaultAttendees: item.fields.DefaultAttendees ? item.fields.DefaultAttendees.split(',') : [],
          isActive: item.fields.IsActive,
          version: item.fields.Version,
          createdAt: item.fields.CreatedAt,
          createdBy: item.fields.CreatedBy,
          updatedAt: item.fields.UpdatedAt,
          updatedBy: item.fields.UpdatedBy,
          usageCount: item.fields.UsageCount || 0,
          lastUsedAt: item.fields.LastUsedAt,
        })
      }
    }

    return templates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  /**
   * Get a template by ID
   */
  async getTemplate(templateId: string): Promise<MeetingTemplate | null> {
    const allTemplates = await this.sharepointService.getListItems('meetingTemplatesListId')

    for (const item of allTemplates) {
      if (item.fields.Id === templateId) {
        return {
          id: item.fields.Id,
          name: item.fields.Name,
          description: item.fields.Description,
          committee: item.fields.Committee,
          category: item.fields.Category,
          items: JSON.parse(item.fields.ItemsJSON || '[]'),
          defaultDuration: item.fields.DefaultDuration,
          defaultStartTime: item.fields.DefaultStartTime,
          defaultLocation: item.fields.DefaultLocation,
          defaultAttendees: item.fields.DefaultAttendees ? item.fields.DefaultAttendees.split(',') : [],
          isActive: item.fields.IsActive,
          version: item.fields.Version,
          createdAt: item.fields.CreatedAt,
          createdBy: item.fields.CreatedBy,
          updatedAt: item.fields.UpdatedAt,
          updatedBy: item.fields.UpdatedBy,
          usageCount: item.fields.UsageCount || 0,
          lastUsedAt: item.fields.LastUsedAt,
        }
      }
    }

    return null
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    user: TokenPayload,
    templateId: string,
    updates: Partial<MeetingTemplate>
  ): Promise<MeetingTemplate> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Check permissions
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (userPermissions.accessLevel !== AccessLevel.Admin && userPermissions.accessLevel !== AccessLevel.Executive) {
      throw new Error('Only administrators can update meeting templates')
    }

    const now = new Date().toISOString()
    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: now,
      updatedBy: user.upn,
    }

    // Update in SharePoint
    await this.sharepointService.updateListItem('meetingTemplatesListId', templateId, {
      Name: updatedTemplate.name,
      Description: updatedTemplate.description,
      ItemsJSON: JSON.stringify(updatedTemplate.items),
      DefaultDuration: this.calculateTotalDuration(updatedTemplate.items),
      IsActive: updatedTemplate.isActive,
      UpdatedAt: now,
      UpdatedBy: user.upn,
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting_template.updated',
      user.upn,
      {
        templateId,
        changes: Object.keys(updates),
      },
      `update_template_${templateId}_${Date.now()}`,
      'unite-meetings'
    )

    return updatedTemplate
  }

  /**
   * Create a meeting from a template
   */
  async createMeetingFromTemplate(
    user: TokenPayload,
    request: CreateMeetingFromTemplateRequest,
    meetingManagementService: any // Would be proper type in real implementation
  ): Promise<{ meetingId: string; agendaItems: AgendaItem[] }> {
    // Get the template
    const template = await this.getTemplate(request.templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Create the meeting first
    const meeting = await meetingManagementService.createMeeting(
      user,
      request.title,
      template.committee,
      request.scheduledDate,
      template.description,
      request.attendees || template.defaultAttendees || []
    )

    // Get template items
    let agendaItems = [...template.items]

    // Apply customizations
    if (request.customItems) {
      // Remove items
      if (request.customItems.remove) {
        agendaItems = agendaItems.filter(item => !request.customItems.remove!.includes(item.id))
      }

      // Modify items
      if (request.customItems.modify) {
        for (const modification of request.customItems.modify) {
          const index = agendaItems.findIndex(item => item.id === modification.itemId)
          if (index >= 0) {
            agendaItems[index] = { ...agendaItems[index], ...modification.changes }
          }
        }
      }

      // Add new items
      if (request.customItems.add) {
        for (const newItem of request.customItems.add) {
          agendaItems.push({
            id: randomUUID(),
            itemOrder: agendaItems.length + 1,
            orderPath: String(agendaItems.length + 1),
            level: 0,
            isStandingItem: false,
            isOptional: false,
            ...newItem,
          } as MeetingTemplateItem)
        }
      }
    }

    // Create agenda items in the meeting
    const createdItems: AgendaItem[] = []

    for (const templateItem of agendaItems) {
      const agendaItem = await meetingManagementService.addAgendaItem(
        user,
        meeting.id,
        templateItem.title,
        templateItem.description,
        templateItem.itemOrder,
        templateItem.role,
        templateItem.presenter,
        templateItem.timeAllocation,
        [], // Supporting documents added separately
        templateItem.voteRequired,
        templateItem.voteType
      )

      createdItems.push(agendaItem)
    }

    // Update template usage stats
    await this.updateTemplateUsage(template.id)

    // Record this usage
    await this.recordTemplateUsage(user, template.id, meeting.id, request.customItems)

    // Audit
    await this.auditService.createAuditEvent(
      'meeting.created_from_template',
      user.upn,
      {
        meetingId: meeting.id,
        templateId: template.id,
        templateName: template.name,
        itemCount: createdItems.length,
        customizations: request.customItems ? 'yes' : 'no',
      },
      `meeting_from_template_${meeting.id}`,
      'unite-meetings'
    )

    return {
      meetingId: meeting.id,
      agendaItems: createdItems,
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(user: TokenPayload, templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Check permissions
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (userPermissions.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only administrators can delete meeting templates')
    }

    // Soft delete - mark as inactive
    await this.sharepointService.updateListItem('meetingTemplatesListId', templateId, {
      IsActive: false,
      UpdatedAt: new Date().toISOString(),
      UpdatedBy: user.upn,
    })

    // Audit
    await this.auditService.createAuditEvent(
      'meeting_template.deleted',
      user.upn,
      {
        templateId,
        name: template.name,
        committee: template.committee,
      },
      `delete_template_${templateId}`,
      'unite-meetings'
    )
  }

  /**
   * Clone a template
   */
  async cloneTemplate(
    user: TokenPayload,
    templateId: string,
    newName: string
  ): Promise<MeetingTemplate> {
    const original = await this.getTemplate(templateId)
    if (!original) {
      throw new Error('Template not found')
    }

    return await this.createTemplate(
      user,
      newName,
      original.description + ' (cloned)',
      original.committee,
      original.category,
      original.items.map(item => ({
        ...item,
        id: randomUUID(), // Generate new IDs
      }))
    )
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<TemplateUsageStats | null> {
    // This would aggregate data from the meetingFromTemplate records
    // Placeholder implementation
    return {
      templateId,
      totalMeetings: 0,
      avgCustomizations: 0,
      mostCommonlyRemoved: [],
      mostCommonlyAdded: [],
      avgDuration: 0,
    }
  }

  // Helper methods

  private calculateTotalDuration(items: MeetingTemplateItem[]): number {
    return items.reduce((total, item) => total + item.timeAllocation, 0)
  }

  private async updateTemplateUsage(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId)
    if (!template) return

    await this.sharepointService.updateListItem('meetingTemplatesListId', templateId, {
      UsageCount: template.usageCount + 1,
      LastUsedAt: new Date().toISOString(),
    })
  }

  private async recordTemplateUsage(
    user: TokenPayload,
    templateId: string,
    meetingId: string,
    customizations?: CreateMeetingFromTemplateRequest['customItems']
  ): Promise<void> {
    const record: MeetingFromTemplate = {
      templateId,
      templateName: '', // Would fetch from template
      meetingId,
      customizations: {
        itemsAdded: customizations?.add?.length || 0,
        itemsRemoved: customizations?.remove?.length || 0,
        itemsModified: customizations?.modify?.length || 0,
      },
      createdAt: new Date().toISOString(),
    }

    // Store usage record in SharePoint
    await this.sharepointService.addListItem('templateUsageListId', {
      Id: randomUUID(),
      TemplateId: templateId,
      MeetingId: meetingId,
      CustomizationsJSON: JSON.stringify(record.customizations),
      CreatedAt: record.createdAt,
      CreatedBy: user.upn,
    })
  }
}
