// Strategy Management Service
// Manages organizational strategies and links them to meeting activities

import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import {
  Strategy,
  StrategyItem,
  LinkedActivity,
  StrategyProgressSummary,
  StrategyContributionType,
  StrategyCardData,
  StrategyMetric,
  Milestone,
} from '@/types/strategy'
import { StrategyLink } from '@/types/meeting'
import { randomUUID } from 'crypto'

export class StrategyService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  /**
   * Create a new strategy (e.g., 5-year plan)
   */
  async createStrategy(
    user: TokenPayload,
    title: string,
    description: string,
    startYear: number,
    endYear: number,
    vision?: string,
    themes?: string[]
  ): Promise<Strategy> {
    const strategyId = randomUUID()

    const strategy: Strategy = {
      id: strategyId,
      title,
      description,
      vision,
      startYear,
      endYear,
      themes: themes || [],
      items: [],
      status: 'draft',
      isCurrentStrategy: false,
      createdAt: new Date().toISOString(),
      createdBy: user.upn,
      updatedAt: new Date().toISOString(),
    }

    // Save to SharePoint
    await this.sharepointService.addListItem('strategiesListId', {
      Id: strategyId,
      Title: title,
      Description: description,
      Vision: vision || '',
      StartYear: startYear,
      EndYear: endYear,
      Themes: JSON.stringify(themes || []),
      Items: JSON.stringify([]),
      Status: 'draft',
      IsCurrentStrategy: false,
      CreatedAt: strategy.createdAt,
      CreatedBy: user.upn,
      UpdatedAt: strategy.updatedAt,
    })

    // Audit
    await this.auditService.createAuditEvent(
      'strategy.created',
      user.upn,
      {
        strategyId,
        title,
        timeframe: `${startYear}-${endYear}`,
      },
      `create_strategy_${strategyId}`,
      'unite-strategy'
    )

    return strategy
  }

  /**
   * Create a strategy item (strategic objective)
   */
  async createStrategyItem(
    user: TokenPayload,
    strategyId: string,
    title: string,
    description: string,
    options: {
      theme?: string
      priority?: 'high' | 'medium' | 'low'
      owner?: string
      targetOutcome?: string
      startDate?: string
      targetCompletionDate?: string
      keyMetrics?: StrategyMetric[]
      milestones?: Milestone[]
    } = {}
  ): Promise<StrategyItem> {
    // Get strategy to update items list
    const strategy = await this.getStrategy(strategyId)
    if (!strategy) {
      throw new Error('Strategy not found')
    }

    // Calculate order number
    const existingItems = await this.getStrategyItems(strategyId)
    const orderNumber = existingItems.length + 1

    const itemId = randomUUID()

    const strategyItem: StrategyItem = {
      id: itemId,
      strategyId,
      title,
      description,
      orderNumber,
      theme: options.theme,
      priority: options.priority || 'medium',
      owner: options.owner,
      targetOutcome: options.targetOutcome,
      keyMetrics: options.keyMetrics || [],
      milestones: options.milestones || [],
      startDate: options.startDate,
      targetCompletionDate: options.targetCompletionDate,
      status: 'not-started',
      progressPercentage: 0,
      linkedActivities: [],
      createdAt: new Date().toISOString(),
      createdBy: user.upn,
      updatedAt: new Date().toISOString(),
    }

    // Save to SharePoint
    await this.sharepointService.addListItem('strategyItemsListId', {
      Id: itemId,
      StrategyId: strategyId,
      Title: title,
      Description: description,
      OrderNumber: orderNumber,
      Theme: options.theme || '',
      Priority: options.priority || 'medium',
      Owner: options.owner || '',
      TargetOutcome: options.targetOutcome || '',
      KeyMetrics: JSON.stringify(options.keyMetrics || []),
      Milestones: JSON.stringify(options.milestones || []),
      StartDate: options.startDate || '',
      TargetCompletionDate: options.targetCompletionDate || '',
      Status: 'not-started',
      ProgressPercentage: 0,
      LinkedActivities: JSON.stringify([]),
      CreatedAt: strategyItem.createdAt,
      CreatedBy: user.upn,
      UpdatedAt: strategyItem.updatedAt,
    })

    // Update strategy items list
    const updatedItems = [...strategy.items, itemId]
    await this.sharepointService.updateListItem('strategiesListId', strategyId, {
      Items: JSON.stringify(updatedItems),
      UpdatedAt: new Date().toISOString(),
    })

    // Audit
    await this.auditService.createAuditEvent(
      'strategy.item_created',
      user.upn,
      {
        strategyId,
        strategyItemId: itemId,
        title,
      },
      `create_strategy_item_${itemId}`,
      'unite-strategy'
    )

    return strategyItem
  }

  /**
   * Link an agenda/minute item to a strategy item
   */
  async linkActivity(
    user: TokenPayload,
    strategyItemId: string,
    activityType: 'agenda-item' | 'minute-item' | 'action' | 'decision',
    activityId: string,
    contributionType: StrategyContributionType,
    meetingContext: {
      meetingId: string
      meetingTitle: string
      meetingDate: string
      committee: string
      itemTitle: string
    },
    contributionDescription?: string,
    outcomes?: string
  ): Promise<LinkedActivity> {
    const linkedActivityId = randomUUID()

    const linkedActivity: LinkedActivity = {
      id: linkedActivityId,
      strategyItemId,
      activityType,
      activityId,
      meetingId: meetingContext.meetingId,
      meetingTitle: meetingContext.meetingTitle,
      meetingDate: meetingContext.meetingDate,
      committee: meetingContext.committee,
      itemTitle: meetingContext.itemTitle,
      contributionType,
      contributionDescription,
      outcomes,
      linkedAt: new Date().toISOString(),
      linkedBy: user.upn,
    }

    // Save to SharePoint
    await this.sharepointService.addListItem('linkedActivitiesListId', {
      Id: linkedActivityId,
      StrategyItemId: strategyItemId,
      ActivityType: activityType,
      ActivityId: activityId,
      MeetingId: meetingContext.meetingId,
      MeetingTitle: meetingContext.meetingTitle,
      MeetingDate: meetingContext.meetingDate,
      Committee: meetingContext.committee,
      ItemTitle: meetingContext.itemTitle,
      ContributionType: contributionType,
      ContributionDescription: contributionDescription || '',
      Outcomes: outcomes || '',
      LinkedAt: linkedActivity.linkedAt,
      LinkedBy: user.upn,
    })

    // Update strategy item
    const strategyItem = await this.getStrategyItem(strategyItemId)
    if (strategyItem) {
      const updatedActivities = [...strategyItem.linkedActivities, linkedActivity]

      await this.sharepointService.updateListItem('strategyItemsListId', strategyItemId, {
        LinkedActivities: JSON.stringify(updatedActivities),
        UpdatedAt: new Date().toISOString(),
      })

      // Auto-update status if first activity
      if (strategyItem.status === 'not-started') {
        await this.updateStrategyItemStatus(user, strategyItemId, 'in-progress')
      }
    }

    // Audit
    await this.auditService.createAuditEvent(
      'strategy.activity_linked',
      user.upn,
      {
        strategyItemId,
        activityType,
        activityId,
        contributionType,
        meetingTitle: meetingContext.meetingTitle,
      },
      `link_activity_${linkedActivityId}`,
      'unite-strategy'
    )

    return linkedActivity
  }

  /**
   * Update strategy item status and progress
   */
  async updateStrategyItemStatus(
    user: TokenPayload,
    strategyItemId: string,
    status: StrategyItem['status'],
    progressPercentage?: number
  ): Promise<StrategyItem> {
    const item = await this.getStrategyItem(strategyItemId)
    if (!item) {
      throw new Error('Strategy item not found')
    }

    const updates: any = {
      Status: status,
      UpdatedAt: new Date().toISOString(),
      UpdatedBy: user.upn,
    }

    if (progressPercentage !== undefined) {
      updates.ProgressPercentage = progressPercentage
    }

    if (status === 'completed' && !item.actualCompletionDate) {
      updates.ActualCompletionDate = new Date().toISOString()
    }

    await this.sharepointService.updateListItem('strategyItemsListId', strategyItemId, updates)

    // Audit
    await this.auditService.createAuditEvent(
      'strategy.item_updated',
      user.upn,
      {
        strategyItemId,
        status,
        progressPercentage,
      },
      `update_strategy_item_${strategyItemId}`,
      'unite-strategy'
    )

    return {
      ...item,
      status,
      progressPercentage: progressPercentage ?? item.progressPercentage,
      actualCompletionDate: updates.ActualCompletionDate || item.actualCompletionDate,
      updatedAt: updates.UpdatedAt,
      updatedBy: user.upn,
    }
  }

  /**
   * Get current active strategy
   */
  async getCurrentStrategy(): Promise<Strategy | null> {
    const response = await this.sharepointService.getListItems('strategiesListId', {
      filter: "IsCurrentStrategy eq true and Status eq 'active'",
    })

    if (response.value.length === 0) {
      return null
    }

    return this.mapStrategyFromSharePoint(response.value[0])
  }

  /**
   * Get strategy progress summary
   */
  async getStrategyProgressSummary(strategyId: string): Promise<StrategyProgressSummary> {
    const strategy = await this.getStrategy(strategyId)
    if (!strategy) {
      throw new Error('Strategy not found')
    }

    const items = await this.getStrategyItems(strategyId)

    // Count items by status
    const completedItems = items.filter(i => i.status === 'completed').length
    const inProgressItems = items.filter(i => i.status === 'in-progress' || i.status === 'on-track').length
    const notStartedItems = items.filter(i => i.status === 'not-started').length
    const atRiskItems = items.filter(i => i.status === 'at-risk' || i.status === 'delayed').length

    // Count activities by type
    const allActivities = items.flatMap(item => item.linkedActivities)
    const activitiesByContributionType = {} as { [key in StrategyContributionType]: number }

    const contributionTypes: StrategyContributionType[] = [
      'initiate',
      'support',
      'related-to',
      'deliver-towards',
      'review',
      'monitor',
      'finalise',
      'report',
    ]

    for (const type of contributionTypes) {
      activitiesByContributionType[type] = allActivities.filter(a => a.contributionType === type).length
    }

    // Calculate timeline
    const now = new Date()
    const startDate = new Date(strategy.startYear, 0, 1)
    const endDate = new Date(strategy.endYear, 11, 31)

    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.max(0, totalDays - elapsedDays)
    const percentageTimeElapsed = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))

    // Check if on track (progress should match time elapsed)
    const averageProgress = items.reduce((sum, item) => sum + item.progressPercentage, 0) / items.length
    const isOnTrack = averageProgress >= percentageTimeElapsed - 10 // Within 10% tolerance

    // Recent activities (last 10)
    const recentActivities = allActivities
      .sort((a, b) => new Date(b.linkedAt).getTime() - new Date(a.linkedAt).getTime())
      .slice(0, 10)

    // Upcoming milestones
    const allMilestones = items.flatMap(item =>
      (item.milestones || []).map(m => ({ ...m, itemTitle: item.title }))
    )
    const upcomingMilestones = allMilestones
      .filter(m => m.status !== 'completed' && new Date(m.targetDate) > now)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .slice(0, 5)

    return {
      strategyId,
      strategyTitle: strategy.title,
      totalItems: items.length,
      completedItems,
      inProgressItems,
      notStartedItems,
      atRiskItems,
      totalLinkedActivities: allActivities.length,
      activitiesByContributionType,
      daysRemaining,
      percentageTimeElapsed,
      isOnTrack,
      recentActivities,
      upcomingMilestones: upcomingMilestones as Milestone[],
    }
  }

  /**
   * Get dashboard card data for all strategy items
   */
  async getStrategyCardData(strategyId: string): Promise<StrategyCardData[]> {
    const items = await this.getStrategyItems(strategyId)

    return items.map(item => {
      const activityCount = item.linkedActivities.length
      const lastActivityDate =
        item.linkedActivities.length > 0
          ? item.linkedActivities.sort(
              (a, b) => new Date(b.linkedAt).getTime() - new Date(a.linkedAt).getTime()
            )[0].linkedAt
          : undefined

      // Determine trend (simple heuristic: if progress increasing, improving)
      const progressTrend: 'improving' | 'stable' | 'declining' =
        item.status === 'completed' || item.progressPercentage > 75
          ? 'improving'
          : item.status === 'at-risk' || item.status === 'delayed'
          ? 'declining'
          : 'stable'

      // Status color
      const statusColor =
        item.status === 'completed'
          ? '#4caf50'
          : item.status === 'on-track' || item.status === 'in-progress'
          ? '#2196f3'
          : item.status === 'at-risk'
          ? '#ff9800'
          : item.status === 'delayed'
          ? '#f44336'
          : '#9e9e9e'

      return {
        item,
        activityCount,
        lastActivityDate,
        progressTrend,
        statusColor,
      }
    })
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string): Promise<Strategy | null> {
    try {
      const item = await this.sharepointService.getListItem('strategiesListId', strategyId)
      return this.mapStrategyFromSharePoint(item)
    } catch (error) {
      return null
    }
  }

  /**
   * Get all strategy items for a strategy
   */
  async getStrategyItems(strategyId: string): Promise<StrategyItem[]> {
    const response = await this.sharepointService.getListItems('strategyItemsListId', {
      filter: `StrategyId eq '${strategyId}'`,
      orderBy: 'OrderNumber',
    })

    return response.value.map(item => this.mapStrategyItemFromSharePoint(item))
  }

  /**
   * Get strategy item by ID
   */
  async getStrategyItem(strategyItemId: string): Promise<StrategyItem | null> {
    try {
      const item = await this.sharepointService.getListItem('strategyItemsListId', strategyItemId)
      return this.mapStrategyItemFromSharePoint(item)
    } catch (error) {
      return null
    }
  }

  // Mapping methods
  private mapStrategyFromSharePoint(item: any): Strategy {
    return {
      id: item.Id,
      title: item.Title,
      description: item.Description,
      vision: item.Vision,
      startYear: item.StartYear,
      endYear: item.EndYear,
      themes: JSON.parse(item.Themes || '[]'),
      items: JSON.parse(item.Items || '[]'),
      status: item.Status,
      isCurrentStrategy: item.IsCurrentStrategy,
      documentId: item.DocumentId,
      docStableId: item.DocStableId,
      createdAt: item.CreatedAt,
      createdBy: item.CreatedBy,
      updatedAt: item.UpdatedAt,
      updatedBy: item.UpdatedBy,
      approvedAt: item.ApprovedAt,
      approvedBy: item.ApprovedBy,
    }
  }

  private mapStrategyItemFromSharePoint(item: any): StrategyItem {
    return {
      id: item.Id,
      strategyId: item.StrategyId,
      title: item.Title,
      description: item.Description,
      orderNumber: item.OrderNumber,
      theme: item.Theme,
      priority: item.Priority,
      owner: item.Owner,
      targetOutcome: item.TargetOutcome,
      keyMetrics: JSON.parse(item.KeyMetrics || '[]'),
      milestones: JSON.parse(item.Milestones || '[]'),
      startDate: item.StartDate,
      targetCompletionDate: item.TargetCompletionDate,
      actualCompletionDate: item.ActualCompletionDate,
      status: item.Status,
      progressPercentage: item.ProgressPercentage || 0,
      linkedActivities: JSON.parse(item.LinkedActivities || '[]'),
      createdAt: item.CreatedAt,
      createdBy: item.CreatedBy,
      updatedAt: item.UpdatedAt,
      updatedBy: item.UpdatedBy,
    }
  }
}
