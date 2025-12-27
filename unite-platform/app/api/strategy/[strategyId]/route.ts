import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { StrategyService } from '@/lib/strategy/strategy-service'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

/**
 * Strategy-specific API endpoints
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { strategyId: string } }
) {
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

    const { strategyId } = params
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    // Initialize services
    const sharepointService = new SharePointService()
    const auditService = new AuditService(sharepointService)
    const strategyService = new StrategyService(sharepointService, auditService)

    switch (endpoint) {
      case 'summary': {
        const summary = await strategyService.getStrategyProgressSummary(strategyId)
        return NextResponse.json({
          success: true,
          summary,
        })
      }

      case 'cards': {
        const cards = await strategyService.getStrategyCardData(strategyId)
        return NextResponse.json({
          success: true,
          cards,
        })
      }

      case 'items': {
        const items = await strategyService.getStrategyItems(strategyId)
        return NextResponse.json({
          success: true,
          items,
        })
      }

      default: {
        // Get strategy details
        const strategy = await strategyService.getStrategy(strategyId)

        if (!strategy) {
          return NextResponse.json(
            { error: 'Strategy not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          strategy,
        })
      }
    }
  } catch (error) {
    console.error('Strategy detail API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
