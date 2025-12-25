'use client'

// Transition Configuration Panel for Workflow Builder

import { useState, useEffect } from 'react'
import { useWorkflowBuilder } from './store'
import { WorkflowTransition } from '@/lib/workflow-engine/definitions'
import { X, Save, Trash2 } from 'lucide-react'

export function TransitionConfigPanel() {
  const {
    selectedEdge,
    transitions,
    updateTransition,
    deleteTransition,
    showTransitionConfig,
    toggleTransitionConfig,
  } = useWorkflowBuilder()

  const [transitionForm, setTransitionForm] = useState<Partial<WorkflowTransition>>({})

  useEffect(() => {
    if (selectedEdge && transitions.has(selectedEdge)) {
      setTransitionForm(transitions.get(selectedEdge)!)
    }
  }, [selectedEdge, transitions])

  if (!showTransitionConfig || !selectedEdge) return null

  const handleSave = () => {
    if (!transitionForm.label) {
      alert('Transition label is required')
      return
    }
    updateTransition(selectedEdge, transitionForm)
    toggleTransitionConfig()
  }

  const handleDelete = () => {
    if (confirm('Delete this transition?')) {
      deleteTransition(selectedEdge)
      toggleTransitionConfig()
    }
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Edit Transition</h2>
        <button onClick={toggleTransitionConfig} className="p-1 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Button Label *
          </label>
          <input
            type="text"
            value={transitionForm.label || ''}
            onChange={(e) => setTransitionForm({ ...transitionForm, label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Submit for Approval"
          />
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm">Requirements</h3>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={transitionForm.requiresComment || false}
              onChange={(e) => setTransitionForm({ ...transitionForm, requiresComment: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Require Comment</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={transitionForm.requiresVote || false}
              onChange={(e) => setTransitionForm({ ...transitionForm, requiresVote: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Require Vote</span>
          </label>

          {transitionForm.requiresVote && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vote Type</label>
              <select
                value={transitionForm.voteType || 'simple-majority'}
                onChange={(e) => setTransitionForm({ ...transitionForm, voteType: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="simple-majority">Simple Majority</option>
                <option value="two-thirds">Two-Thirds</option>
                <option value="unanimous">Unanimous</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={transitionForm.requiresAttachments || false}
              onChange={(e) => setTransitionForm({ ...transitionForm, requiresAttachments: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Require Attachments</span>
          </label>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Required Roles (comma separated)
          </label>
          <input
            type="text"
            value={(transitionForm.requiredRoles || []).join(', ')}
            onChange={(e) => setTransitionForm({
              ...transitionForm,
              requiredRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., Admin, Board"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmation Message
          </label>
          <input
            type="text"
            value={transitionForm.confirmationMessage || ''}
            onChange={(e) => setTransitionForm({ ...transitionForm, confirmationMessage: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Are you sure?"
          />
        </div>

        <div className="sticky bottom-0 bg-white border-t pt-4 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Save className="w-4 h-4" />
            Save Transition
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
