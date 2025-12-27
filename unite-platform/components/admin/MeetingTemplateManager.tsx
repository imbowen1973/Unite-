'use client'

// Meeting Template Manager Component
// Main interface for managing meeting templates

import { useState, useEffect } from 'react'
import { MeetingTemplate } from '@/types/meeting-template'
import { MeetingTemplateBuilder } from './MeetingTemplateBuilder'
import { Plus, Edit, Copy, Trash2, Calendar, Clock, Users, ChevronDown } from 'lucide-react'

export function MeetingTemplateManager() {
  const [templates, setTemplates] = useState<MeetingTemplate[]>([])
  const [selectedCommittee, setSelectedCommittee] = useState<string>('all')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateCommittee, setNewTemplateCommittee] = useState('')

  const committees = ['Board', 'Academic Standards', 'Student Welfare', 'Finance', 'Audit']

  const startNewTemplate = () => {
    if (!newTemplateName || !newTemplateCommittee) {
      alert('Please enter template name and select committee')
      return
    }
    setEditingTemplate(null)
    setShowBuilder(true)
  }

  const saveTemplate = async (items: any[]) => {
    // Save template via API
    const template: Partial<MeetingTemplate> = {
      name: editingTemplate?.name || newTemplateName,
      description: editingTemplate?.description || '',
      committee: editingTemplate?.committee || newTemplateCommittee,
      category: 'board',
      items,
    }

    try {
      const response = await fetch('/api/meeting-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: editingTemplate ? 'update' : 'create',
          templateId: editingTemplate?.id,
          template,
        }),
      })

      if (response.ok) {
        alert('Template saved successfully!')
        setShowBuilder(false)
        setNewTemplateName('')
        setNewTemplateCommittee('')
        // Refresh templates list
      }
    } catch (error) {
      alert('Error saving template')
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return

    try {
      await fetch('/api/meeting-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'delete',
          templateId,
        }),
      })
      // Refresh templates
    } catch (error) {
      alert('Error deleting template')
    }
  }

  const cloneTemplate = async (template: MeetingTemplate) => {
    const newName = prompt(`Clone template as:`, `${template.name} (Copy)`)
    if (!newName) return

    try {
      await fetch('/api/meeting-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'clone',
          templateId: template.id,
          newName,
        }),
      })
      // Refresh templates
    } catch (error) {
      alert('Error cloning template')
    }
  }

  if (showBuilder) {
    return (
      <div className="h-full">
        <MeetingTemplateBuilder
          initialItems={editingTemplate?.items || []}
          onSave={saveTemplate}
          onCancel={() => {
            setShowBuilder(false)
            setEditingTemplate(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white border-b">
        <h2 className="text-xl font-semibold mb-4">Meeting Templates</h2>
        <p className="text-gray-600 mb-4">
          Create reusable meeting templates with standing items. When creating a meeting, select a
          template to pre-populate the agenda.
        </p>

        {/* Create New Template Form */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium mb-3">Create New Template</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="Template name (e.g., Autumn Board Meeting)"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <select
              value={newTemplateCommittee}
              onChange={e => setNewTemplateCommittee(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Select Committee</option>
              {committees.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={startNewTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Filter by committee:</span>
        <select
          value={selectedCommittee}
          onChange={e => setSelectedCommittee(e.target.value)}
          className="px-3 py-1.5 border rounded-md text-sm"
        >
          <option value="all">All Committees</option>
          {committees.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
            <p className="text-gray-600">
              Create your first meeting template to streamline meeting creation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <span className="text-sm text-gray-600">{template.committee}</span>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded capitalize">
                    {template.category}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{template.items.length} agenda items</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{template.defaultDuration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Used {template.usageCount} times</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingTemplate(template)
                      setShowBuilder(true)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => cloneTemplate(template)}
                    className="px-3 py-2 border rounded-md hover:bg-gray-50"
                    title="Clone"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-3 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
