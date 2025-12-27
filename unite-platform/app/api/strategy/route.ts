import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { StrategyService } from '@/lib/strategy/strategy-service'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { StrategyMetric, Milestone } from '@/types/strategy'

/**
 * Strategy Management API
 *
 * Actions:
 * - createStrategy: Create new organizational strategy
 * - createStrategyItem: Create strategic objective
 * - updateStrategyItemStatus: Update item status and progress
 * - linkActivity: Link meeting activity to strategy item
 * - getCurrent: Get current active strategy
 * - getSummary: Get progress summary
 * - getCards: Get dashboard card data
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
    const strategyService = new StrategyService(sharepointService, auditService)

    switch (action) {
      case 'createStrategy': {
        const { title, description, startYear, endYear, vision, themes } = body

        if (!title || !startYear || !endYear) {
          return NextResponse.json(
            { error: 'Missing required fields: title, startYear, endYear' },
            { status: 400 }
          )
        }

        const strategy = await strategyService.createStrategy(
          user,
          title,
          description,
          startYear,
          endYear,
          vision,
          themes
        )

        return NextResponse.json({
          success: true,
          strategy,
        })
      }

      case 'createStrategyItem': {
        const {
          strategyId,
          title,
          description,
          theme,
          priority,
          owner,
          targetOutcome,
          startDate,
          targetCompletionDate,
          keyMetrics,
          milestones,
        } = body

        if (!strategyId || !title || !description) {
          return NextResponse.json(
            { error: 'Missing required fields: strategyId, title, description' },
            { status: 400 }
          )
        }

        const strategyItem = await strategyService.createStrategyItem(user, strategyId, title, description, {
          theme,
          priority,
          owner,
          targetOutcome,
          startDate,
          targetCompletionDate,
          keyMetrics: keyMetrics as StrategyMetric[],
          milestones: milestones as Milestone[],
        })

        return NextResponse.json({
          success: true,
          strategyItem,
        })
      }

      case 'updateStrategyItemStatus': {
        const { strategyItemId, status, progressPercentage } = body

        if (!strategyItemId || !status) {
          return NextResponse.json(
            { error: 'Missing required fields: strategyItemId, status' },
            { status: 400 }
          )
        }

        const strategyItem = await strategyService.updateStrategyItemStatus(
          user,
          strategyItemId,
          status,
          progressPercentage
        )

        return NextResponse.json({
          success: true,
          strategyItem,
        })
      }

      case 'linkActivity': {
        const {
          strategyItemId,
          activityType,
          activityId,
          contributionType,
          meetingContext,
          contributionDescription,
          outcomes,
        } = body

        if (!strategyItemId || !activityType || !activityId || !contributionType || !meetingContext) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          )
        }

        const linkedActivity = await strategyService.linkActivity(
          user,
          strategyItemId,
          activityType,
          activityId,
          contributionType,
          meetingContext,
          contributionDescription,
          outcomes
        )

        return NextResponse.json({
          success: true,
          linkedActivity,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Strategy API error:', error)
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
 * GET current active strategy
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

    // Initialize services
    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const strategyService = new StrategyService(sharepointService, auditService)

    const strategy = await strategyService.getCurrentStrategy()

    return NextResponse.json({
      success: true,
      strategy,
    })
  } catch (error) {
    console.error('Strategy GET error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
