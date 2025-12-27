'use client'

// Strategy Dashboard Component
// Displays current organizational strategy with progress tracking

import { useState, useEffect } from 'react'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { StrategyCardData, StrategyProgressSummary, Strategy } from '@/types/strategy'
import Link from 'next/link'

interface StrategyDashboardProps {
  onManageStrategy?: () => void
}

export function StrategyDashboard({ onManageStrategy }: StrategyDashboardProps) {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [cardData, setCardData] = useState<StrategyCardData[]>([])
  const [progressSummary, setProgressSummary] = useState<StrategyProgressSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStrategyData()
  }, [])

  const loadStrategyData = async () => {
    try {
      const response = await fetch('/api/strategy/current', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStrategy(data.strategy)

        if (data.strategy) {
          // Load card data
          const cardsResponse = await fetch(`/api/strategy/${data.strategy.id}/cards`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          })

          if (cardsResponse.ok) {
            const cardsData = await cardsResponse.json()
            setCardData(cardsData.cards)
          }

          // Load progress summary
          const summaryResponse = await fetch(`/api/strategy/${data.strategy.id}/summary`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          })

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json()
            setProgressSummary(summaryData.summary)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load strategy data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Strategy</h3>
        <p className="text-gray-600 mb-4">Create a strategic plan to track organizational progress</p>
        <button
          onClick={onManageStrategy}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Create Strategy
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Strategy Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{strategy.title}</h2>
            <p className="text-blue-100">{strategy.description}</p>
            {strategy.vision && (
              <p className="mt-3 text-sm italic border-l-2 border-blue-300 pl-3 text-blue-100">
                Vision: {strategy.vision}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{strategy.startYear}-{strategy.endYear}</div>
            {progressSummary && (
              <div className="mt-2 text-sm">
                {progressSummary.daysRemaining} days remaining
              </div>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        {progressSummary && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <div className="text-2xl font-bold">
                {progressSummary.completedItems}/{progressSummary.totalItems}
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">In Progress</span>
              </div>
              <div className="text-2xl font-bold">{progressSummary.inProgressItems}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">At Risk</span>
              </div>
              <div className="text-2xl font-bold">{progressSummary.atRiskItems}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Total Activities</span>
              </div>
              <div className="text-2xl font-bold">{progressSummary.totalLinkedActivities}</div>
            </div>
          </div>
        )}

        {/* On Track Indicator */}
        {progressSummary && (
          <div className="mt-4 flex items-center gap-2">
            {progressSummary.isOnTrack ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span className="font-medium">On Track</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-300" />
                <span className="font-medium">Needs Attention</span>
              </>
            )}
            <span className="text-sm text-blue-100 ml-2">
              ({progressSummary.percentageTimeElapsed.toFixed(0)}% of time elapsed)
            </span>
          </div>
        )}
      </div>

      {/* Strategy Items Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Strategic Objectives</h3>
          {strategy.themes && strategy.themes.length > 0 && (
            <div className="flex gap-2">
              {strategy.themes.map((theme, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardData.map(card => (
            <Link
              key={card.item.id}
              href={`/strategy/${strategy.id}/item/${card.item.id}`}
              className="block bg-white border rounded-lg p-5 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500">
                      #{card.item.orderNumber}
                    </span>
                    {card.item.theme && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {card.item.theme}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 line-clamp-2">{card.item.title}</h4>
                </div>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: card.statusColor }}
                  title={card.item.status}
                ></div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{card.item.description}</p>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-xs font-medium text-gray-700">
                    {card.item.progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${card.item.progressPercentage}%`,
                      backgroundColor: card.statusColor,
                    }}
                  ></div>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1" title="Linked activities">
                    <Activity className="w-3 h-3" />
                    <span>{card.activityCount}</span>
                  </div>
                  {card.item.owner && (
                    <div className="flex items-center gap-1" title="Owner">
                      <Users className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{card.item.owner}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {card.progressTrend === 'improving' && (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  )}
                  {card.progressTrend === 'declining' && (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  {card.progressTrend === 'stable' && <Minus className="w-3 h-3 text-gray-400" />}
                  <span className="capitalize">{card.item.priority}</span>
                </div>
              </div>

              {/* Target Date */}
              {card.item.targetCompletionDate && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Target: {new Date(card.item.targetCompletionDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}

              {/* Last Activity */}
              {card.lastActivityDate && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    Last activity: {new Date(card.lastActivityDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}

              {/* View Details Link */}
              <div className="mt-3 flex items-center justify-end text-blue-600 hover:text-blue-800 text-sm font-medium">
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>

        {cardData.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No strategic objectives defined yet</p>
          </div>
        )}
      </div>

      {/* Recent Activities */}
      {progressSummary && progressSummary.recentActivities.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Strategy Activities</h3>
          <div className="space-y-3">
            {progressSummary.recentActivities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      {activity.contributionType.replace(/-/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{activity.committee}</span>
                  </div>
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {activity.itemTitle}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {activity.meetingTitle} • {new Date(activity.meetingDate).toLocaleDateString('en-GB')}
                  </p>
                  {activity.outcomes && (
                    <p className="text-xs text-gray-700 mt-2 italic">{activity.outcomes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {progressSummary && progressSummary.upcomingMilestones.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Milestones</h3>
          <div className="space-y-3">
            {progressSummary.upcomingMilestones.map(milestone => (
              <div key={milestone.id} className="flex items-center gap-3 p-3 border-l-3 border-orange-500 bg-orange-50">
                <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                  {milestone.description && (
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-gray-900">
                    {new Date(milestone.targetDate).toLocaleDateString('en-GB')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.ceil(
                      (new Date(milestone.targetDate).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
