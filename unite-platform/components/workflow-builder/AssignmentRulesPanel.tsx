'use client'

// Assignment Rules Configuration Panel

import { useState } from 'react'
import { useWorkflowBuilder } from './store'
import { WorkflowAssignmentRule } from '@/lib/workflow-engine/definitions'
import { X, Plus, Trash2 } from 'lucide-react'

export function AssignmentRulesPanel() {
  const { assignmentRules, addAssignmentRule, deleteAssignmentRule, showRulesConfig, toggleRulesConfig } = useWorkflowBuilder()

  const [newRule, setNewRule] = useState<Partial<WorkflowAssignmentRule>>({
    id: `rule-${Date.now()}`,
    priority: 10,
    documentType: [],
    documentCategory: [],
    committee: [],
    tags: [],
  })

  if (!showRulesConfig) return null

  const handleAddRule = () => {
    addAssignmentRule(newRule as WorkflowAssignmentRule)
    setNewRule({
      id: `rule-${Date.now()}`,
      priority: 10,
      documentType: [],
      documentCategory: [],
      committee: [],
      tags: [],
    })
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Assignment Rules</h2>
        <button onClick={toggleRulesConfig} className="p-1 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <strong>Assignment Rules</strong> determine when this workflow automatically applies to documents.
          All criteria in a rule must match for the workflow to be assigned.
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Add New Rule</h3>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <input
              type="number"
              value={newRule.priority}
              onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Document Types (comma separated)
            </label>
            <input
              type="text"
              value={(newRule.documentType || []).join(', ')}
              onChange={(e) => setNewRule({
                ...newRule,
                documentType: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="e.g., complaint, grievance"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Categories (comma separated)
            </label>
            <input
              type="text"
              value={(newRule.documentCategory || []).join(', ')}
              onChange={(e) => setNewRule({
                ...newRule,
                documentCategory: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="e.g., student, staff"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Committees (comma separated)
            </label>
            <input
              type="text"
              value={(newRule.committee || []).join(', ')}
              onChange={(e) => setNewRule({
                ...newRule,
                committee: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="e.g., StudentWelfare, AcademicStandards"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={(newRule.tags || []).join(', ')}
              onChange={(e) => setNewRule({
                ...newRule,
                tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="e.g., urgent, high-priority"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <button
            onClick={handleAddRule}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-sm mb-3">Existing Rules</h3>
          <div className="space-y-2">
            {assignmentRules.map((rule) => (
              <div key={rule.id} className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs font-semibold text-blue-600">Priority: {rule.priority}</div>
                  <button
                    onClick={() => deleteAssignmentRule(rule.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  {rule.documentType && rule.documentType.length > 0 && (
                    <div><strong>Types:</strong> {rule.documentType.join(', ')}</div>
                  )}
                  {rule.documentCategory && rule.documentCategory.length > 0 && (
                    <div><strong>Categories:</strong> {rule.documentCategory.join(', ')}</div>
                  )}
                  {rule.committee && rule.committee.length > 0 && (
                    <div><strong>Committees:</strong> {rule.committee.join(', ')}</div>
                  )}
                  {rule.tags && rule.tags.length > 0 && (
                    <div><strong>Tags:</strong> {rule.tags.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
            {assignmentRules.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">No rules yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
