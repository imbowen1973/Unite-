// Agenda Item Utilities for Unite Platform
// Handles hierarchical ordering, time flow calculations, and reordering

import { AgendaItem, AgendaReorderOperation } from '@/types/meeting'

/**
 * Calculate order path for an agenda item
 * Examples: "1", "1.1", "1.2", "1.2.1", "7", "7.1"
 */
export function calculateOrderPath(
  itemOrder: number,
  parentItem?: AgendaItem
): string {
  if (!parentItem) {
    return String(itemOrder)
  }
  return `${parentItem.orderPath}.${itemOrder}`
}

/**
 * Calculate level (depth) for an agenda item
 */
export function calculateLevel(orderPath: string): number {
  return orderPath.split('.').length - 1
}

/**
 * Parse order path into segments
 * "7.2.1" => [7, 2, 1]
 */
export function parseOrderPath(orderPath: string): number[] {
  return orderPath.split('.').map(Number)
}

/**
 * Compare two order paths for sorting
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareOrderPaths(a: string, b: string): number {
  const aParts = parseOrderPath(a)
  const bParts = parseOrderPath(b)

  const maxLength = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] || 0
    const bVal = bParts[i] || 0

    if (aVal < bVal) return -1
    if (aVal > bVal) return 1
  }

  return 0
}

/**
 * Sort agenda items by order path
 */
export function sortAgendaItems(items: AgendaItem[]): AgendaItem[] {
  return items.sort((a, b) => compareOrderPaths(a.orderPath, b.orderPath))
}

/**
 * Get all children of a parent item (recursively)
 */
export function getChildrenRecursive(
  parentId: string,
  allItems: AgendaItem[]
): AgendaItem[] {
  const directChildren = allItems.filter(item => item.parentItemId === parentId)
  const allChildren: AgendaItem[] = []

  for (const child of directChildren) {
    allChildren.push(child)
    // Recursively get children of this child
    const grandchildren = getChildrenRecursive(child.id, allItems)
    allChildren.push(...grandchildren)
  }

  return allChildren
}

/**
 * Get all direct children of a parent item (non-recursive)
 */
export function getDirectChildren(
  parentId: string | undefined,
  allItems: AgendaItem[]
): AgendaItem[] {
  if (!parentId) {
    // Return top-level items
    return allItems.filter(item => !item.parentItemId)
  }
  return allItems.filter(item => item.parentItemId === parentId)
}

/**
 * Calculate start and end times for all agenda items
 * Based on meeting start time and item durations
 */
export function calculateAgendaTimes(
  items: AgendaItem[],
  meetingStartTime: string
): AgendaItem[] {
  const sortedItems = sortAgendaItems(items)
  const updatedItems: AgendaItem[] = []

  let currentTime = new Date(meetingStartTime)

  for (const item of sortedItems) {
    const startTime = new Date(currentTime)
    const endTime = new Date(currentTime.getTime() + item.timeAllocation * 60000)

    updatedItems.push({
      ...item,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    })

    // Move current time forward by the duration
    currentTime = endTime
  }

  return updatedItems
}

/**
 * Recalculate order paths when an item is moved
 * Returns updated items with new order paths
 */
export function recalculateOrderPaths(
  movedItemId: string,
  newParentId: string | undefined,
  newOrderPosition: number,
  allItems: AgendaItem[]
): AgendaReorderOperation[] {
  const operations: AgendaReorderOperation[] = []
  const movedItem = allItems.find(item => item.id === movedItemId)

  if (!movedItem) {
    throw new Error('Moved item not found')
  }

  // Get all children of the moved item (they move with it)
  const children = getChildrenRecursive(movedItemId, allItems)
  const affectedChildrenIds = children.map(c => c.id)

  // Calculate new order path for moved item
  const newParent = newParentId
    ? allItems.find(item => item.id === newParentId)
    : undefined

  const newOrderPath = calculateOrderPath(newOrderPosition, newParent)
  const newLevel = calculateLevel(newOrderPath)

  // Add operation for moved item
  operations.push({
    itemId: movedItemId,
    newOrderPath,
    newItemOrder: newOrderPosition,
    affectedChildrenIds,
  })

  // Recalculate paths for all children
  for (const child of children) {
    const oldPathSegments = parseOrderPath(child.orderPath)
    const movedPathSegments = parseOrderPath(movedItem.orderPath)
    const newParentPathSegments = parseOrderPath(newOrderPath)

    // Replace the moved item's portion of the path with the new path
    const relativeSegments = oldPathSegments.slice(movedPathSegments.length)
    const newChildPath = [...newParentPathSegments, ...relativeSegments].join('.')

    operations.push({
      itemId: child.id,
      newOrderPath: newChildPath,
      newItemOrder: child.itemOrder,
      affectedChildrenIds: [],
    })
  }

  // Recalculate paths for siblings that need to shift
  const siblings = getDirectChildren(newParentId, allItems).filter(
    item => item.id !== movedItemId && !affectedChildrenIds.includes(item.id)
  )

  for (const sibling of siblings) {
    const siblingOrder = sibling.itemOrder

    // If sibling's order >= new position, increment it
    if (siblingOrder >= newOrderPosition) {
      const adjustedOrder = siblingOrder + 1
      const adjustedPath = calculateOrderPath(adjustedOrder, newParent)

      operations.push({
        itemId: sibling.id,
        newOrderPath: adjustedPath,
        newItemOrder: adjustedOrder,
        affectedChildrenIds: [],
      })
    }
  }

  return operations
}

/**
 * Generate next available order number for a given level
 */
export function getNextOrderNumber(
  parentId: string | undefined,
  allItems: AgendaItem[]
): number {
  const siblings = getDirectChildren(parentId, allItems)

  if (siblings.length === 0) {
    return 1
  }

  const maxOrder = Math.max(...siblings.map(item => item.itemOrder))
  return maxOrder + 1
}

/**
 * Validate agenda item hierarchy
 * Returns validation errors if any
 */
export function validateAgendaHierarchy(items: AgendaItem[]): string[] {
  const errors: string[] = []

  for (const item of items) {
    // Check if parent exists
    if (item.parentItemId) {
      const parent = items.find(i => i.id === item.parentItemId)
      if (!parent) {
        errors.push(`Item "${item.title}" has invalid parent ID: ${item.parentItemId}`)
      }
    }

    // Check order path matches structure
    const expectedLevel = calculateLevel(item.orderPath)
    if (expectedLevel !== item.level) {
      errors.push(`Item "${item.title}" has mismatched level (expected ${expectedLevel}, got ${item.level})`)
    }

    // Check for circular references
    if (item.parentItemId === item.id) {
      errors.push(`Item "${item.title}" cannot be its own parent`)
    }

    // Validate breaks don't have sub-items
    if (item.role === 'break') {
      const children = getDirectChildren(item.id, items)
      if (children.length > 0) {
        errors.push(`Break "${item.title}" cannot have sub-items`)
      }
    }
  }

  return errors
}

/**
 * Format order path for display
 * "7.2.1" => "7.2.1"
 * For UI display with proper formatting
 */
export function formatOrderPath(orderPath: string): string {
  return orderPath
}

/**
 * Get indent level for UI rendering
 * Returns number of pixels or units to indent
 */
export function getIndentLevel(level: number): number {
  return level * 24 // 24px per level
}

/**
 * Check if item can have children
 */
export function canHaveChildren(item: AgendaItem, maxDepth: number = 3): boolean {
  if (item.role === 'break') {
    return false // Breaks cannot have sub-items
  }

  if (item.level >= maxDepth) {
    return false // Maximum depth reached
  }

  return true
}

/**
 * Create a break agenda item
 */
export function createBreakItem(
  meetingId: string,
  title: string,
  duration: number,
  orderPosition: number,
  parentId?: string
): Partial<AgendaItem> {
  return {
    meetingId,
    title: title || 'Break',
    description: '',
    itemOrder: orderPosition,
    parentItemId: parentId,
    orderPath: '', // Will be calculated
    level: parentId ? 1 : 0,
    timeAllocation: duration,
    role: 'break',
    status: 'pending',
    supportingDocuments: [],
    voteRequired: 'none',
  }
}

/**
 * Calculate total meeting duration including all agenda items
 */
export function calculateTotalDuration(items: AgendaItem[]): number {
  return items.reduce((total, item) => total + item.timeAllocation, 0)
}

/**
 * Get agenda summary for display
 */
export function getAgendaSummary(items: AgendaItem[]): {
  totalItems: number
  topLevelItems: number
  subItems: number
  breaks: number
  totalDuration: number
  itemsWithVotes: number
} {
  const topLevelItems = items.filter(item => item.level === 0 && item.role !== 'break')
  const subItems = items.filter(item => item.level > 0)
  const breaks = items.filter(item => item.role === 'break')
  const itemsWithVotes = items.filter(item => item.voteRequired !== 'none')

  return {
    totalItems: items.length,
    topLevelItems: topLevelItems.length,
    subItems: subItems.length,
    breaks: breaks.length,
    totalDuration: calculateTotalDuration(items),
    itemsWithVotes: itemsWithVotes.length,
  }
}

/**
 * Find parent item
 */
export function findParent(item: AgendaItem, allItems: AgendaItem[]): AgendaItem | undefined {
  if (!item.parentItemId) return undefined
  return allItems.find(i => i.id === item.parentItemId)
}

/**
 * Get full ancestry path (all parents up to root)
 */
export function getAncestryPath(item: AgendaItem, allItems: AgendaItem[]): AgendaItem[] {
  const ancestors: AgendaItem[] = []
  let current = item

  while (current.parentItemId) {
    const parent = findParent(current, allItems)
    if (!parent) break
    ancestors.unshift(parent) // Add to front
    current = parent
  }

  return ancestors
}
