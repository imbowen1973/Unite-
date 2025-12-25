'use client'

// State Configuration Panel for Workflow Builder

import { useState, useEffect } from 'react'
import { useWorkflowBuilder } from './store'
import { WorkflowState } from '@/lib/workflow-engine/definitions'
import { X, Plus, Trash2, Save, AlertCircle } from 'lucide-react'

const colorOptions = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
]

const actionOptions = ['view', 'edit', 'comment', 'upload_evidence', 'approve', 'reject']

export function StateConfigPanel() {
  const {
    selectedNode,
    states,
    addState,
    updateState,
    deleteState,
    showStateConfig,
    toggleStateConfig,
  } = useWorkflowBuilder()

  const [isNew, setIsNew] = useState(false)
  const [stateForm, setStateForm] = useState<Partial<WorkflowState>>({
    id: '',
    label: '',
    description: '',
    color: 'blue',
    isInitial: false,
    isFinal: false,
    allowedActions: [],
  })

  useEffect(() => {
    if (selectedNode && states.has(selectedNode)) {
      const state = states.get(selectedNode)!
      setStateForm(state)
      setIsNew(false)
    } else {
      // New state
      setStateForm({
        id: `state-${Date.now()}`,
        label: '',
        description: '',
        color: 'blue',
        isInitial: false,
        isFinal: false,
        allowedActions: ['view'],
      })
      setIsNew(true)
    }
  }, [selectedNode, states])

  if (!showStateConfig) return null

  const handleSave = () => {
    if (!stateForm.label || !stateForm.id) {
      alert('State label is required')
      return
    }

    if (isNew) {
      addState(stateForm as WorkflowState, { x: 250, y: 250 })
    } else {
      updateState(stateForm.id!, stateForm)
    }
    toggleStateConfig()
  }

  const handleDelete = () => {
    if (selectedNode && confirm('Delete this state? All connected transitions will also be removed.')) {
      deleteState(selectedNode)
      toggleStateConfig()
    }
  }

  const toggleAction = (action: string) => {
    const actions = stateForm.allowedActions || []
    if (actions.includes(action)) {
      setStateForm({
        ...stateForm,
        allowedActions: actions.filter(a => a !== action),
      })
    } else {
      setStateForm({
        ...stateForm,
        allowedActions: [...actions, action],
      })
    }
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {isNew ? 'New State' : 'Edit State'}
        </h2>
        <button
          onClick={toggleStateConfig}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State Label *
            </label>
            <input
              type="text"
              value={stateForm.label || ''}
              onChange={(e) => setStateForm({ ...stateForm, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Under Review"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={stateForm.description || ''}
              onChange={(e) => setStateForm({ ...stateForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="What happens in this state?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  onClick={() => setStateForm({ ...stateForm, color: color.value })}
                  className={`
                    h-10 rounded-md ${color.class} transition-all
                    ${stateForm.color === color.value ? 'ring-4 ring-blue-400 scale-110' : 'opacity-70 hover:opacity-100'}
                  `}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* State Type */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm text-gray-900">State Type</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={stateForm.isInitial || false}
              onChange={(e) => setStateForm({ ...stateForm, isInitial: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-sm">Initial State (START)</div>
              <div className="text-xs text-gray-500">Workflow begins in this state</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={stateForm.isFinal || false}
              onChange={(e) => setStateForm({ ...stateForm, isFinal: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-sm">Final State (END)</div>
              <div className="text-xs text-gray-500">Workflow completes in this state</div>
            </div>
          </label>
        </div>

        {/* Allowed Actions */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm text-gray-900">Allowed Actions</h3>
          <div className="space-y-2">
            {actionOptions.map(action => (
              <label key={action} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(stateForm.allowedActions || []).includes(action)}
                  onChange={() => toggleAction(action)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm">{action.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SLA Settings */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm text-gray-900">SLA (Service Level Agreement)</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Duration (hours)
            </label>
            <input
              type="number"
              value={stateForm.sla?.maxDuration || ''}
              onChange={(e) => setStateForm({
                ...stateForm,
                sla: { ...stateForm.sla, maxDuration: parseInt(e.target.value) || 0 }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 120 (5 days)"
            />
          </div>

          {stateForm.sla?.maxDuration && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warning At (hours)
                </label>
                <input
                  type="number"
                  value={stateForm.sla?.warningAt || ''}
                  onChange={(e) => setStateForm({
                    ...stateForm,
                    sla: { ...stateForm.sla, warningAt: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 96 (4 days)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escalate To (Role)
                </label>
                <input
                  type="text"
                  value={stateForm.sla?.escalateTo || ''}
                  onChange={(e) => setStateForm({
                    ...stateForm,
                    sla: { ...stateForm.sla, escalateTo: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Admin"
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t pt-4 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            <Save className="w-4 h-4" />
            Save State
          </button>

          {!isNew && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
