'use client'

// Strategy Detail View Component
// Shows detailed progress and linked activities for a specific strategy item

import { useState, useEffect } from 'react'
import {
  Target,
  Calendar,
  User,
  TrendingUp,
  Activity,
  FileText,
  CheckCircle,
  Clock,
  ArrowLeft,
  Plus,
  Link as LinkIcon,
} from 'lucide-react'
import { StrategyItem, LinkedActivity } from '@/types/strategy'
import Link from 'next/link'

interface StrategyDetailViewProps {
  strategyId: string
  strategyItemId: string
  onBack?: () => void
}

export function StrategyDetailView({
  strategyId,
  strategyItemId,
  onBack,
}: StrategyDetailViewProps) {
  const [item, setItem] = useState<StrategyItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLinkActivity, setShowLinkActivity] = useState(false)

  useEffect(() => {
    loadStrategyItem()
  }, [strategyItemId])

  const loadStrategyItem = async () => {
    try {
      const response = await fetch(`/api/strategy/${strategyId}/item/${strategyItemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setItem(data.item)
      }
    } catch (error) {
      console.error('Failed to load strategy item:', error)
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

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Strategy item not found</p>
      </div>
    )
  }

  // Group activities by contribution type
  const activitiesByType = item.linkedActivities.reduce((acc, activity) => {
    if (!acc[activity.contributionType]) {
      acc[activity.contributionType] = []
    }
    acc[activity.contributionType].push(activity)
    return acc
  }, {} as { [key: string]: LinkedActivity[] })

  // Calculate days until target completion
  const daysUntilTarget = item.targetCompletionDate
    ? Math.ceil(
        (new Date(item.targetCompletionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b">
        <div className="flex items-start gap-4 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mt-1 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-gray-500">
                Strategy Item #{item.orderNumber}
              </span>
              {item.theme && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {item.theme}
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  item.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : item.status === 'on-track' || item.status === 'in-progress'
                    ? 'bg-blue-100 text-blue-700'
                    : item.status === 'at-risk'
                    ? 'bg-orange-100 text-orange-700'
                    : item.status === 'delayed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {item.status.replace(/-/g, ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h2>
            <p className="text-gray-600">{item.description}</p>
          </div>
          <button
            onClick={() => setShowLinkActivity(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <LinkIcon className="w-4 h-4" />
            Link Activity
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">Progress</div>
            <div className="text-2xl font-bold text-gray-900">{item.progressPercentage}%</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">Activities</div>
            <div className="text-2xl font-bold text-gray-900">{item.linkedActivities.length}</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">Priority</div>
            <div className="text-lg font-medium text-gray-900 capitalize">{item.priority}</div>
          </div>
          {item.owner && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Owner</div>
              <div className="text-sm font-medium text-gray-900 truncate">{item.owner}</div>
            </div>
          )}
          {daysUntilTarget !== null && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Days Remaining</div>
              <div
                className={`text-2xl font-bold ${
                  daysUntilTarget < 30
                    ? 'text-red-600'
                    : daysUntilTarget < 90
                    ? 'text-orange-600'
                    : 'text-gray-900'
                }`}
              >
                {daysUntilTarget}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Target Outcome */}
            {item.targetOutcome && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Target Outcome
                </h3>
                <p className="text-gray-700 text-sm">{item.targetOutcome}</p>
              </div>
            )}

            {/* Key Metrics */}
            {item.keyMetrics && item.keyMetrics.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Key Metrics</h3>
                <div className="space-y-3">
                  {item.keyMetrics.map(metric => (
                    <div key={metric.id} className="border-l-3 border-blue-500 pl-3">
                      <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <span className="text-gray-500">Target:</span>
                        <span className="font-medium">
                          {metric.target} {metric.unit}
                        </span>
                      </div>
                      {metric.current !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Current:</span>
                          <span className="font-medium text-blue-600">
                            {metric.current} {metric.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            {item.milestones && item.milestones.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Milestones</h3>
                <div className="space-y-2">
                  {item.milestones.map(milestone => (
                    <div
                      key={milestone.id}
                      className={`p-3 rounded ${
                        milestone.status === 'completed'
                          ? 'bg-green-50 border border-green-200'
                          : milestone.status === 'overdue'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {milestone.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{milestone.title}</div>
                          {milestone.description && (
                            <div className="text-xs text-gray-600 mt-1">{milestone.description}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(milestone.targetDate).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
              <div className="space-y-2 text-sm">
                {item.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Start:</span>
                    <span className="font-medium">
                      {new Date(item.startDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
                {item.targetCompletionDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">
                      {new Date(item.targetCompletionDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
                {item.actualCompletionDate && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium">
                      {new Date(item.actualCompletionDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Linked Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Linked Activities ({item.linkedActivities.length})
              </h3>

              {item.linkedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">No activities linked yet</p>
                  <button
                    onClick={() => setShowLinkActivity(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Link First Activity
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(activitiesByType).map(([type, activities]) => (
                    <div key={type}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        {type.replace(/-/g, ' ')} ({activities.length})
                      </h4>
                      <div className="space-y-3">
                        {activities.map(activity => (
                          <div
                            key={activity.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                    {activity.activityType.replace(/-/g, ' ')}
                                  </span>
                                  <span className="text-xs text-gray-500">{activity.committee}</span>
                                </div>
                                <h5 className="font-medium text-gray-900">{activity.itemTitle}</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  {activity.meetingTitle} •{' '}
                                  {new Date(activity.meetingDate).toLocaleDateString('en-GB')}
                                </p>
                                {activity.contributionDescription && (
                                  <p className="text-sm text-gray-700 mt-2 italic">
                                    {activity.contributionDescription}
                                  </p>
                                )}
                                {activity.outcomes && (
                                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                    <div className="text-xs font-medium text-green-700 mb-1">
                                      Outcomes:
                                    </div>
                                    <p className="text-sm text-green-900">{activity.outcomes}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                                  <User className="w-3 h-3" />
                                  <span>Linked by {activity.linkedBy}</span>
                                  <span>•</span>
                                  <span>{new Date(activity.linkedAt).toLocaleDateString('en-GB')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Link Activity Modal */}
      {showLinkActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Link Activity to Strategy</h3>
            <p className="text-sm text-gray-600 mb-4">
              This feature will be available in the agenda/minutes editing interface.
              Activities are typically linked when creating or editing agenda items.
            </p>
            <button
              onClick={() => setShowLinkActivity(false)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
