'use client'

// Main Workflow Builder Page

import { useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useWorkflowBuilder } from '@/components/workflow-builder/store'
import { WorkflowCanvas } from '@/components/workflow-builder/WorkflowCanvas'
import { StateConfigPanel } from '@/components/workflow-builder/StateConfigPanel'
import { TransitionConfigPanel } from '@/components/workflow-builder/TransitionConfigPanel'
import { FieldsPanel } from '@/components/workflow-builder/FieldsPanel'
import { AssignmentRulesPanel } from '@/components/workflow-builder/AssignmentRulesPanel'
import {
  Save,
  Upload,
  Download,
  Play,
  Settings,
  FileText,
  GitBranch,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

export default function WorkflowBuilderPage() {
  const {
    name,
    description,
    category,
    setWorkflowInfo,
    toggleFieldConfig,
    toggleRulesConfig,
    toggleSettings,
    exportWorkflow,
    validateWorkflow,
    resetWorkflow,
  } = useWorkflowBuilder()

  const [showMetadata, setShowMetadata] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleValidate = () => {
    const { valid, errors } = validateWorkflow()
    setValidationErrors(errors)
    if (valid) {
      alert('Workflow is valid! ✓')
    }
  }

  const handleSave = async () => {
    const { valid, errors } = validateWorkflow()
    if (!valid) {
      alert('Please fix validation errors:\n' + errors.join('\n'))
      setValidationErrors(errors)
      return
    }

    const workflow = exportWorkflow()

    try {
      const response = await fetch('/api/workflow-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'createDefinition',
          definition: workflow,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Workflow saved successfully!')
      } else {
        alert('Error saving workflow: ' + data.error)
      }
    } catch (error) {
      alert('Error saving workflow: ' + (error as Error).message)
    }
  }

  const handleExport = () => {
    const workflow = exportWorkflow()
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-${name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleNew = () => {
    if (confirm('Create a new workflow? Current work will be lost.')) {
      resetWorkflow()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Workflow Builder</h1>
          {showMetadata && (
            <div className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setWorkflowInfo(e.target.value, description, category)}
                placeholder="Workflow Name"
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setWorkflowInfo(name, e.target.value, category)}
                placeholder="Description"
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={category}
                onChange={(e) => setWorkflowInfo(name, description, e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="approval">Approval</option>
                <option value="complaint">Complaint</option>
                <option value="review">Review</option>
                <option value="ethics">Ethics</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            Validate
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Save Workflow
          </button>

          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            New
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Configure</h2>

            <button
              onClick={toggleFieldConfig}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Fields</div>
                <div className="text-xs text-gray-500">Custom fields</div>
              </div>
            </button>

            <button
              onClick={toggleRulesConfig}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <GitBranch className="w-5 h-5 text-purple-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Assignment Rules</div>
                <div className="text-xs text-gray-500">Auto-routing</div>
              </div>
            </button>

            <button
              onClick={toggleSettings}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Settings</div>
                <div className="text-xs text-gray-500">Workflow config</div>
              </div>
            </button>
          </div>

          {validationErrors.length > 0 && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-sm text-red-900">Validation Errors</span>
              </div>
              <ul className="space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i} className="text-xs text-red-700">• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1">
          <ReactFlowProvider>
            <WorkflowCanvas />
          </ReactFlowProvider>
        </div>
      </div>

      {/* Configuration Panels (Right Sidebar) */}
      <StateConfigPanel />
      <TransitionConfigPanel />
      <FieldsPanel />
      <AssignmentRulesPanel />
    </div>
  )
}
