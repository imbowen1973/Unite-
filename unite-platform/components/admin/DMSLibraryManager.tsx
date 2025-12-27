'use client'

// DMS Library Manager Component
// Interface for creating and managing DMS libraries and site collections

import { useState } from 'react'
import { Database, Plus, Folder, Settings, Trash2, CheckCircle } from 'lucide-react'

interface DMSLibrary {
  id: string
  name: string
  siteCollection: string
  purpose: string
  allowedAccessLevels: string[]
  retentionPeriod: number
  createdAt: string
  documentCount: number
}

export function DMSLibraryManager() {
  const [libraries, setLibraries] = useState<DMSLibrary[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    siteCollection: '',
    purpose: '',
    allowedAccessLevels: [] as string[],
    retentionPeriod: 2555, // 7 years default
  })

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/dms/libraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'createLibrary',
          ...formData,
        }),
      })

      if (response.ok) {
        alert('Library created successfully!')
        setShowCreateForm(false)
        setFormData({
          name: '',
          siteCollection: '',
          purpose: '',
          allowedAccessLevels: [],
          retentionPeriod: 2555,
        })
      }
    } catch (error) {
      alert('Error creating library')
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">DMS Libraries</h2>
            <p className="text-gray-600 mt-1">
              Manage SharePoint document libraries and site collections
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Create Library
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
            <h3 className="font-medium mb-4">Create New Library</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Library Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Policy Documents"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Site Collection</label>
                <input
                  type="text"
                  value={formData.siteCollection}
                  onChange={e => setFormData({ ...formData, siteCollection: e.target.value })}
                  placeholder="e.g., unite-policies"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <textarea
                  value={formData.purpose}
                  onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="What is this library used for?"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Retention Period (days)</label>
                <input
                  type="number"
                  value={formData.retentionPeriod}
                  onChange={e => setFormData({ ...formData, retentionPeriod: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Allowed Access Levels</label>
                <select
                  multiple
                  value={formData.allowedAccessLevels}
                  onChange={e => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setFormData({ ...formData, allowedAccessLevels: selected })
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  size={4}
                >
                  <option value="Admin">Admin</option>
                  <option value="Executive">Executive</option>
                  <option value="Board">Board</option>
                  <option value="Public">Public</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Create Library
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Libraries List */}
      <div className="flex-1 overflow-y-auto p-6">
        {libraries.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Libraries Yet</h3>
            <p className="text-gray-600">Create your first DMS library to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {libraries.map(library => (
              <div key={library.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold">{library.name}</h3>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-3">{library.purpose}</p>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <div>Site: <span className="font-medium">{library.siteCollection}</span></div>
                  <div>{library.documentCount} documents</div>
                  <div>Retention: {Math.floor(library.retentionPeriod / 365)} years</div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">
                    Manage
                  </button>
                  <button className="px-3 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50">
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
