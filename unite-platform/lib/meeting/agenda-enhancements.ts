// Agenda Item Enhancement Methods for MeetingManagementService
// Adds support for hierarchical agenda items, auto time-flow, and breaks

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AgendaItem, AgendaReorderOperation, MeetingConfiguration } from '@/types/meeting'
import {
  calculateOrderPath,
  calculateLevel,
  getChildrenRecursive,
  calculateAgendaTimes,
  recalculateOrderPaths,
  getNextOrderNumber,
  validateAgendaHierarchy,
  createBreakItem,
  sortAgendaItems,
} from './agenda-utils'
import { randomUUID } from 'crypto'

export class AgendaEnhancementService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  /**
   * Add a sub-item to an existing agenda item
   */
  async addSubItem(
    user: TokenPayload,
    parentItemId: string,
    title: string,
    description: string,
    timeAllocation: number,
    presenter?: string,
    role: 'information' | 'action' | 'decision' | 'voting' | 'discussion' = 'discussion'
  ): Promise<AgendaItem> {
    // Get parent item
    const parentItem = await this.getAgendaItemById(parentItemId)
    if (!parentItem) {
      throw new Error('Parent agenda item not found')
    }

    // Check if parent can have children
    if (parentItem.role === 'break') {
      throw new Error('Breaks cannot have sub-items')
    }

    if (parentItem.level >= 3) {
      throw new Error('Maximum nesting depth (3 levels) reached')
    }

    // Get all agenda items for this meeting to calculate order
    const allItems = await this.getAgendaItemsForMeeting(parentItem.meetingId)

    // Calculate next order number for this parent
    const itemOrder = getNextOrderNumber(parentItemId, allItems)

    // Calculate order path
    const orderPath = calculateOrderPath(itemOrder, parentItem)
    const level = calculateLevel(orderPath)

    // Create sub-item
    const subItemId = randomUUID()
    const subItem: AgendaItem = {
      id: subItemId,
      meetingId: parentItem.meetingId,
      title,
      description,
      itemOrder,
      parentItemId,
      orderPath,
      level,
      timeAllocation,
      presenter: presenter || user.upn,
      status: 'pending',
      supportingDocuments: [],
      voteRequired: 'none',
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Save to SharePoint
    await this.sharepointService.addListItem('agendaItemsListId', {
      Id: subItemId,
      MeetingId: subItem.meetingId,
      Title: title,
      Description: description,
      ItemOrder: itemOrder,
      ParentItemId: parentItemId,
      OrderPath: orderPath,
      Level: level,
      TimeAllocation: timeAllocation,
      Presenter: presenter || user.upn,
      Status: 'pending',
      SupportingDocuments: '',
      VoteRequired: 'none',
      Role: role,
      CreatedAt: subItem.createdAt,
      UpdatedAt: subItem.updatedAt,
    })

    // Recalculate times for all agenda items
    await this.recalculateAgendaTimes(parentItem.meetingId)

    // Audit
    await this.auditService.createAuditEvent(
      'agenda_item.sub_item_added',
      user.upn,
      {
        meetingId: parentItem.meetingId,
        parentItemId,
        subItemId,
        title,
        orderPath,
      },
      `add_sub_item_${subItemId}`,
      'unite-meetings'
    )

    return subItem
  }

  /**
   * Add a break to the agenda
   */
  async addBreak(
    user: TokenPayload,
    meetingId: string,
    title: string,
    duration: number,
    insertAfterItemId?: string
  ): Promise<AgendaItem> {
    // Get all agenda items
    const allItems = await this.getAgendaItemsForMeeting(meetingId)

    let orderPosition: number
    let parentId: string | undefined

    if (insertAfterItemId) {
      const afterItem = allItems.find(item => item.id === insertAfterItemId)
      if (!afterItem) {
        throw new Error('Insert-after item not found')
      }
      // Insert after this item at the same level
      orderPosition = afterItem.itemOrder + 1
      parentId = afterItem.parentItemId
    } else {
      // Add to end
      orderPosition = getNextOrderNumber(undefined, allItems)
    }

    // Create break item
    const breakItemPartial = createBreakItem(meetingId, title, duration, orderPosition, parentId)
    const breakItemId = randomUUID()

    // Calculate order path
    const parentItem = parentId ? allItems.find(item => item.id === parentId) : undefined
    const orderPath = calculateOrderPath(orderPosition, parentItem)
    const level = calculateLevel(orderPath)

    const breakItem: AgendaItem = {
      ...breakItemPartial,
      id: breakItemId,
      orderPath,
      level,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AgendaItem

    // Save to SharePoint
    await this.sharepointService.addListItem('agendaItemsListId', {
      Id: breakItemId,
      MeetingId: meetingId,
      Title: title,
      Description: '',
      ItemOrder: orderPosition,
      ParentItemId: parentId || null,
      OrderPath: orderPath,
      Level: level,
      TimeAllocation: duration,
      Presenter: '',
      Status: 'pending',
      SupportingDocuments: '',
      VoteRequired: 'none',
      Role: 'break',
      CreatedAt: breakItem.createdAt,
      UpdatedAt: breakItem.updatedAt,
    })

    // Recalculate times
    await this.recalculateAgendaTimes(meetingId)

    // Audit
    await this.auditService.createAuditEvent(
      'agenda_item.break_added',
      user.upn,
      {
        meetingId,
        breakItemId,
        title,
        duration,
        orderPath,
      },
      `add_break_${breakItemId}`,
      'unite-meetings'
    )

    return breakItem
  }

  /**
   * Reorder an agenda item (moves children with it)
   */
  async reorderAgendaItem(
    user: TokenPayload,
    itemId: string,
    newParentId: string | undefined,
    newOrderPosition: number
  ): Promise<AgendaReorderOperation[]> {
    // Get the item
    const item = await this.getAgendaItemById(itemId)
    if (!item) {
      throw new Error('Agenda item not found')
    }

    // Get all items for this meeting
    const allItems = await this.getAgendaItemsForMeeting(item.meetingId)

    // Calculate reordering operations
    const operations = recalculateOrderPaths(itemId, newParentId, newOrderPosition, allItems)

    // Apply all operations to SharePoint
    for (const operation of operations) {
      await this.sharepointService.updateListItem('agendaItemsListId', operation.itemId, {
        OrderPath: operation.newOrderPath,
        ItemOrder: operation.newItemOrder,
        ParentItemId: newParentId || null,
        Level: calculateLevel(operation.newOrderPath),
        UpdatedAt: new Date().toISOString(),
      })
    }

    // Recalculate times to flow correctly
    await this.recalculateAgendaTimes(item.meetingId)

    // Audit
    await this.auditService.createAuditEvent(
      'agenda_item.reordered',
      user.upn,
      {
        meetingId: item.meetingId,
        itemId,
        newParentId,
        newOrderPosition,
        affectedItems: operations.length,
      },
      `reorder_item_${itemId}_${Date.now()}`,
      'unite-meetings'
    )

    return operations
  }

  /**
   * Update time allocation for an item and recalculate flow
   */
  async updateTimeAllocation(
    user: TokenPayload,
    itemId: string,
    newDuration: number
  ): Promise<AgendaItem> {
    const item = await this.getAgendaItemById(itemId)
    if (!item) {
      throw new Error('Agenda item not found')
    }

    // Update duration
    await this.sharepointService.updateListItem('agendaItemsListId', itemId, {
      TimeAllocation: newDuration,
      UpdatedAt: new Date().toISOString(),
    })

    // Recalculate times for entire agenda
    await this.recalculateAgendaTimes(item.meetingId)

    // Audit
    await this.auditService.createAuditEvent(
      'agenda_item.time_updated',
      user.upn,
      {
        itemId,
        oldDuration: item.timeAllocation,
        newDuration,
      },
      `update_time_${itemId}`,
      'unite-meetings'
    )

    return { ...item, timeAllocation: newDuration }
  }

  /**
   * Recalculate all agenda item times based on meeting start time
   */
  async recalculateAgendaTimes(meetingId: string): Promise<void> {
    // Get meeting configuration
    const config = await this.getMeetingConfiguration(meetingId)

    if (!config.autoCalculateTimes) {
      return // Auto-calculation disabled
    }

    // Get all agenda items
    const allItems = await this.getAgendaItemsForMeeting(meetingId)

    // Calculate times
    const updatedItems = calculateAgendaTimes(allItems, config.startTime)

    // Update all items in SharePoint
    for (const item of updatedItems) {
      await this.sharepointService.updateListItem('agendaItemsListId', item.id, {
        StartTime: item.startTime,
        EndTime: item.endTime,
      })
    }
  }

  /**
   * Get meeting configuration
   */
  async getMeetingConfiguration(meetingId: string): Promise<MeetingConfiguration> {
    // In a real implementation, this would be stored in SharePoint
    // For now, return defaults
    return {
      meetingId,
      startTime: new Date().toISOString(), // Would come from meeting record
      allowSubItems: true,
      autoCalculateTimes: true,
      defaultBreakDuration: 15,
    }
  }

  /**
   * Validate entire agenda structure
   */
  async validateAgenda(meetingId: string): Promise<{ valid: boolean; errors: string[] }> {
    const allItems = await this.getAgendaItemsForMeeting(meetingId)
    const errors = validateAgendaHierarchy(allItems)

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get agenda items formatted with hierarchy
   */
  async getAgendaWithHierarchy(meetingId: string): Promise<AgendaItem[]> {
    const allItems = await this.getAgendaItemsForMeeting(meetingId)
    return sortAgendaItems(allItems)
  }

  // Helper methods (would reference MeetingManagementService in real implementation)
  private async getAgendaItemById(itemId: string): Promise<AgendaItem | null> {
    // Placeholder - would query SharePoint
    return null
  }

  private async getAgendaItemsForMeeting(meetingId: string): Promise<AgendaItem[]> {
    // Placeholder - would query SharePoint and filter by meetingId
    return []
  }
}
