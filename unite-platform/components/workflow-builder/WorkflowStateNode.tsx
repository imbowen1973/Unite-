'use client'

// Custom Node Component for Workflow States in the Visual Builder

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { WorkflowState } from '@/lib/workflow-engine/definitions'
import { useWorkflowBuilder } from './store'
import { Circle, Square, CheckCircle2, XCircle, Clock } from 'lucide-react'

const colorMap: Record<string, string> = {
  gray: 'bg-gray-100 border-gray-400 text-gray-900',
  blue: 'bg-blue-100 border-blue-500 text-blue-900',
  yellow: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  orange: 'bg-orange-100 border-orange-500 text-orange-900',
  purple: 'bg-purple-100 border-purple-500 text-purple-900',
  green: 'bg-green-100 border-green-500 text-green-900',
  red: 'bg-red-100 border-red-500 text-red-900',
}

export const WorkflowStateNode = memo(({ data, selected }: NodeProps<WorkflowState>) => {
  const selectNode = useWorkflowBuilder(state => state.selectNode)

  const stateColor = data.color || 'gray'
  const colorClasses = colorMap[stateColor] || colorMap.gray

  const handleClick = () => {
    selectNode(data.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`
        relative px-4 py-3 rounded-lg border-2 min-w-[180px] cursor-pointer
        transition-all duration-200
        ${colorClasses}
        ${selected ? 'ring-4 ring-blue-400 shadow-lg scale-105' : 'shadow-md hover:shadow-lg'}
      `}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-600 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-600 !w-3 !h-3 !border-2 !border-white"
      />

      {/* State Indicators */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {data.isInitial && (
            <div className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
              START
            </div>
          )}
          {data.isFinal && (
            <div className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">
              END
            </div>
          )}
        </div>
        {data.sla && (
          <Clock className="w-4 h-4 text-orange-600" title="Has SLA" />
        )}
      </div>

      {/* State Label */}
      <div className="font-semibold text-sm mb-1">{data.label}</div>

      {/* State Description */}
      {data.description && (
        <div className="text-xs opacity-75 line-clamp-2">{data.description}</div>
      )}

      {/* Allowed Actions */}
      {data.allowedActions && data.allowedActions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.allowedActions.slice(0, 3).map(action => (
            <span
              key={action}
              className="text-xs bg-white/50 px-1.5 py-0.5 rounded"
            >
              {action}
            </span>
          ))}
          {data.allowedActions.length > 3 && (
            <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded">
              +{data.allowedActions.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

WorkflowStateNode.displayName = 'WorkflowStateNode'
