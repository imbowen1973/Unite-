'use client'

// Workflow Gallery & Management Page

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WorkflowDefinition } from '@/lib/workflow-engine/definitions'
import { Plus, Play, Edit, Trash2, Copy, Eye, CheckCircle, XCircle } from 'lucide-react'

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflow-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'listDefinitions',
        }),
      })

      const data = await response.json()
      if (data.success) {
        setWorkflows(data.definitions)
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewWorkflow = () => {
    router.push('/workflow-builder')
  }

  const handleEditWorkflow = (workflowId: string) => {
    router.push(`/workflow-builder?id=${workflowId}`)
  }

  const filteredWorkflows = workflows.filter(w => {
    if (filter === 'all') return true
    if (filter === 'active') return w.isActive
    if (filter === 'inactive') return !w.isActive
    return w.category === filter
  })

  const categories = Array.from(new Set(workflows.map(w => w.category)))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
            <p className="text-gray-600 mt-1">Manage and create custom workflows</p>
          </div>
          <button
            onClick={handleNewWorkflow}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            New Workflow
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All ({workflows.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'inactive'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Inactive
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                filter === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Workflows Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading workflows...</p>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600 text-lg mb-4">No workflows found</p>
            <button
              onClick={handleNewWorkflow}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              Create Your First Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map(workflow => (
              <div
                key={workflow.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-gray-900">{workflow.name}</h3>
                      {workflow.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-500" title="Active" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" title="Inactive" />
                      )}
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded capitalize">
                      {workflow.category}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {workflow.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div>
                      <span className="font-medium">{workflow.states.length}</span> states
                    </div>
                    <div>
                      <span className="font-medium">{workflow.transitions.length}</span> transitions
                    </div>
                    <div>
                      <span className="font-medium">{workflow.fields?.length || 0}</span> fields
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mb-4">
                    Version {workflow.version} • Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditWorkflow(workflow.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => alert('View instances feature coming soon')}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="View Instances"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => alert('Clone feature coming soon')}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="Clone Workflow"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
