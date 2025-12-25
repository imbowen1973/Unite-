'use client'

// Main Workflow Builder Canvas with ReactFlow

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Panel,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { WorkflowStateNode } from './WorkflowStateNode'
import { useWorkflowBuilder } from './store'
import { Plus, Save, Play, FileDown, FileUp } from 'lucide-react'

const nodeTypes = {
  workflowState: WorkflowStateNode,
}

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectEdge,
    toggleStateConfig,
    validateWorkflow,
  } = useWorkflowBuilder()

  const { fitView } = useReactFlow()

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: any) => {
      selectEdge(edge.id)
    },
    [selectEdge]
  )

  const handlePaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
  }, [selectNode, selectEdge])

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 })
  }, [fitView])

  const minimapNodeColor = useCallback((node: any) => {
    const colorMap: Record<string, string> = {
      gray: '#9CA3AF',
      blue: '#3B82F6',
      yellow: '#EAB308',
      orange: '#F97316',
      purple: '#A855F7',
      green: '#22C55E',
      red: '#EF4444',
    }
    return colorMap[node.data?.color || 'gray'] || '#9CA3AF'
  }, [])

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange as any}
        onEdgesChange={onEdgesChange as any}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }}
      >
        <Background color="#e2e8f0" gap={15} />
        <Controls />
        <MiniMap
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />

        <Panel position="top-left" className="flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
          <button
            onClick={toggleStateConfig}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add State
          </button>
          <button
            onClick={handleFitView}
            className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            Fit View
          </button>
        </Panel>

        <Panel position="top-right" className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-xs">
          <h3 className="font-semibold text-sm mb-2">Quick Tips</h3>
          <ul className="text-xs space-y-1 text-gray-700">
            <li>• Click "Add State" to create new states</li>
            <li>• Drag from a state's bottom handle to connect</li>
            <li>• Click on states or transitions to edit</li>
            <li>• One state must be marked as START</li>
            <li>• At least one state must be marked as END</li>
          </ul>
        </Panel>
      </ReactFlow>
    </div>
  )
}
