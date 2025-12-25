'use client'

// Fields Configuration Panel

import { useState } from 'react'
import { useWorkflowBuilder } from './store'
import { WorkflowField } from '@/lib/workflow-engine/definitions'
import { X, Plus, Trash2, Save } from 'lucide-react'

export function FieldsPanel() {
  const { fields, addField, deleteField, showFieldConfig, toggleFieldConfig } = useWorkflowBuilder()

  const [newField, setNewField] = useState<Partial<WorkflowField>>({
    name: '',
    label: '',
    type: 'text',
    required: false,
  })

  if (!showFieldConfig) return null

  const handleAddField = () => {
    if (!newField.name || !newField.label) {
      alert('Field name and label are required')
      return
    }
    addField(newField as WorkflowField)
    setNewField({ name: '', label: '', type: 'text', required: false })
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Workflow Fields</h2>
        <button onClick={toggleFieldConfig} className="p-1 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Add New Field</h3>

          <input
            type="text"
            value={newField.name || ''}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            placeholder="Field name (e.g., complainantName)"
            className="w-full px-3 py-2 border rounded-md"
          />

          <input
            type="text"
            value={newField.label || ''}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
            placeholder="Field label (e.g., Complainant Name)"
            className="w-full px-3 py-2 border rounded-md"
          />

          <select
            value={newField.type}
            onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
            <option value="select">Select</option>
            <option value="multiselect">Multi-Select</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newField.required}
              onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Required</span>
          </label>

          <button
            onClick={handleAddField}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-sm mb-3">Existing Fields</h3>
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="font-medium text-sm">{field.label}</div>
                  <div className="text-xs text-gray-500">
                    {field.type} {field.required && '• Required'}
                  </div>
                </div>
                <button
                  onClick={() => deleteField(field.name)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">No fields yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
