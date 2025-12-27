'use client'

// System Settings Component
// Platform-wide configuration and settings management

import { useState } from 'react'
import { Settings, Save, RefreshCw, Mail, Clock, Database, Shield, Bell } from 'lucide-react'

interface SystemConfig {
  // Email Settings
  emailEnabled: boolean
  smtpHost: string
  smtpPort: number
  emailFrom: string
  emailNotifications: {
    meetingInvites: boolean
    agendaUpdates: boolean
    documentApprovals: boolean
    workflowTransitions: boolean
    slaWarnings: boolean
  }

  // Workflow Settings
  workflowDefaults: {
    autoAssignEnabled: boolean
    requireCommentOnReject: boolean
    defaultSLAHours: number
    escalationEnabled: boolean
  }

  // Meeting Settings
  meetingDefaults: {
    defaultDuration: number
    bufferTime: number
    autoCalculateTimes: boolean
    allowSubItems: boolean
    maxAgendaDepth: number
    defaultBreakDuration: number
  }

  // DMS Settings
  dmsSettings: {
    retentionPolicyEnabled: boolean
    defaultRetentionDays: number
    versioningEnabled: boolean
    maxVersions: number
    autoArchiveEnabled: boolean
  }

  // Audit Settings
  auditSettings: {
    enabled: boolean
    retentionDays: number
    logLevel: 'minimal' | 'standard' | 'detailed'
    includeReadOperations: boolean
  }

  // Security Settings
  securitySettings: {
    sessionTimeoutMinutes: number
    requireMFA: boolean
    passwordExpiryDays: number
    maxLoginAttempts: number
  }
}

export function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    emailEnabled: true,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    emailFrom: 'noreply@university.ac.uk',
    emailNotifications: {
      meetingInvites: true,
      agendaUpdates: true,
      documentApprovals: true,
      workflowTransitions: true,
      slaWarnings: true,
    },
    workflowDefaults: {
      autoAssignEnabled: true,
      requireCommentOnReject: true,
      defaultSLAHours: 120,
      escalationEnabled: true,
    },
    meetingDefaults: {
      defaultDuration: 120,
      bufferTime: 5,
      autoCalculateTimes: true,
      allowSubItems: true,
      maxAgendaDepth: 3,
      defaultBreakDuration: 15,
    },
    dmsSettings: {
      retentionPolicyEnabled: true,
      defaultRetentionDays: 2555,
      versioningEnabled: true,
      maxVersions: 10,
      autoArchiveEnabled: false,
    },
    auditSettings: {
      enabled: true,
      retentionDays: 365,
      logLevel: 'standard',
      includeReadOperations: false,
    },
    securitySettings: {
      sessionTimeoutMinutes: 480,
      requireMFA: false,
      passwordExpiryDays: 90,
      maxLoginAttempts: 5,
    },
  })

  const [activeSection, setActiveSection] = useState<'email' | 'workflow' | 'meeting' | 'dms' | 'audit' | 'security'>('email')
  const [hasChanges, setHasChanges] = useState(false)

  const handleSave = async () => {
    try {
      const response = await fetch('/api/system-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'updateConfig',
          config,
        }),
      })

      if (response.ok) {
        alert('Settings saved successfully!')
        setHasChanges(false)
      }
    } catch (error) {
      alert('Error saving settings')
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default settings?')) return

    try {
      const response = await fetch('/api/system-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'resetToDefaults',
        }),
      })

      if (response.ok) {
        alert('Settings reset to defaults!')
        // Reload config
      }
    } catch (error) {
      alert('Error resetting settings')
    }
  }

  const updateConfig = (updates: Partial<SystemConfig>) => {
    setConfig({ ...config, ...updates })
    setHasChanges(true)
  }

  const sections = [
    { id: 'email' as const, label: 'Email & Notifications', icon: Mail },
    { id: 'workflow' as const, label: 'Workflow Defaults', icon: RefreshCw },
    { id: 'meeting' as const, label: 'Meeting Defaults', icon: Clock },
    { id: 'dms' as const, label: 'Document Management', icon: Database },
    { id: 'audit' as const, label: 'Audit & Logging', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">System Settings</h2>
            <p className="text-gray-600 mt-1">Configure platform-wide settings and defaults</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                hasChanges
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Sections */}
        <div className="w-64 border-r bg-gray-50 overflow-y-auto">
          <div className="p-4 space-y-1">
            {sections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Panel - Settings Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Email Settings */}
          {activeSection === 'email' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Email & Notifications</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable Email</h4>
                    <p className="text-sm text-gray-600">Send email notifications to users</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.emailEnabled}
                    onChange={e => updateConfig({ emailEnabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={config.smtpHost}
                    onChange={e => updateConfig({ smtpHost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={config.smtpPort}
                    onChange={e => updateConfig({ smtpPort: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">From Email Address</label>
                  <input
                    type="email"
                    value={config.emailFrom}
                    onChange={e => updateConfig({ emailFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Email Notification Types</h4>
                  <div className="space-y-2">
                    {Object.entries(config.emailNotifications).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={e =>
                            updateConfig({
                              emailNotifications: {
                                ...config.emailNotifications,
                                [key]: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workflow Settings */}
          {activeSection === 'workflow' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Workflow Defaults</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Auto-assign Workflows</h4>
                    <p className="text-sm text-gray-600">Automatically assign workflows based on rules</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.workflowDefaults.autoAssignEnabled}
                    onChange={e =>
                      updateConfig({
                        workflowDefaults: {
                          ...config.workflowDefaults,
                          autoAssignEnabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Require Comment on Reject</h4>
                    <p className="text-sm text-gray-600">Users must provide a reason when rejecting</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.workflowDefaults.requireCommentOnReject}
                    onChange={e =>
                      updateConfig({
                        workflowDefaults: {
                          ...config.workflowDefaults,
                          requireCommentOnReject: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable SLA Escalation</h4>
                    <p className="text-sm text-gray-600">Send escalation notifications on SLA breaches</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.workflowDefaults.escalationEnabled}
                    onChange={e =>
                      updateConfig({
                        workflowDefaults: {
                          ...config.workflowDefaults,
                          escalationEnabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Default SLA (hours)</label>
                  <input
                    type="number"
                    value={config.workflowDefaults.defaultSLAHours}
                    onChange={e =>
                      updateConfig({
                        workflowDefaults: {
                          ...config.workflowDefaults,
                          defaultSLAHours: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Default time limit for workflow states (120 hours = 5 days)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Settings */}
          {activeSection === 'meeting' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Meeting Defaults</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Default Meeting Duration (minutes)</label>
                  <input
                    type="number"
                    value={config.meetingDefaults.defaultDuration}
                    onChange={e =>
                      updateConfig({
                        meetingDefaults: {
                          ...config.meetingDefaults,
                          defaultDuration: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Buffer Time Between Items (minutes)</label>
                  <input
                    type="number"
                    value={config.meetingDefaults.bufferTime}
                    onChange={e =>
                      updateConfig({
                        meetingDefaults: {
                          ...config.meetingDefaults,
                          bufferTime: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Default Break Duration (minutes)</label>
                  <input
                    type="number"
                    value={config.meetingDefaults.defaultBreakDuration}
                    onChange={e =>
                      updateConfig({
                        meetingDefaults: {
                          ...config.meetingDefaults,
                          defaultBreakDuration: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Maximum Agenda Depth</label>
                  <input
                    type="number"
                    value={config.meetingDefaults.maxAgendaDepth}
                    min={1}
                    max={5}
                    onChange={e =>
                      updateConfig({
                        meetingDefaults: {
                          ...config.meetingDefaults,
                          maxAgendaDepth: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    How many levels of sub-items are allowed (1-5)
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Auto-calculate Times</h4>
                    <p className="text-sm text-gray-600">Automatically calculate agenda item times</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.meetingDefaults.autoCalculateTimes}
                    onChange={e =>
                      updateConfig({
                        meetingDefaults: {
                          ...config.meetingDefaults,
                          autoCalculateTimes: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Allow Sub-items</h4>
                    <p className="text-sm text-gray-600">Enable hierarchical agenda items</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.meetingDefaults.allowSubItems}
                    onChange={e =>
                      updateConfig({
                        meetingDefaults: {
                          ...config.meetingDefaults,
                          allowSubItems: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DMS Settings */}
          {activeSection === 'dms' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Document Management</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable Retention Policy</h4>
                    <p className="text-sm text-gray-600">Automatically manage document lifecycle</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.dmsSettings.retentionPolicyEnabled}
                    onChange={e =>
                      updateConfig({
                        dmsSettings: {
                          ...config.dmsSettings,
                          retentionPolicyEnabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Default Retention Period (days)</label>
                  <input
                    type="number"
                    value={config.dmsSettings.defaultRetentionDays}
                    onChange={e =>
                      updateConfig({
                        dmsSettings: {
                          ...config.dmsSettings,
                          defaultRetentionDays: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    2555 days = 7 years (typical for academic records)
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable Versioning</h4>
                    <p className="text-sm text-gray-600">Keep previous versions of documents</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.dmsSettings.versioningEnabled}
                    onChange={e =>
                      updateConfig({
                        dmsSettings: {
                          ...config.dmsSettings,
                          versioningEnabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Maximum Versions to Keep</label>
                  <input
                    type="number"
                    value={config.dmsSettings.maxVersions}
                    onChange={e =>
                      updateConfig({
                        dmsSettings: {
                          ...config.dmsSettings,
                          maxVersions: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Auto-archive Old Documents</h4>
                    <p className="text-sm text-gray-600">Move old documents to archive automatically</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.dmsSettings.autoArchiveEnabled}
                    onChange={e =>
                      updateConfig({
                        dmsSettings: {
                          ...config.dmsSettings,
                          autoArchiveEnabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Audit Settings */}
          {activeSection === 'audit' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Audit & Logging</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable Audit Logging</h4>
                    <p className="text-sm text-gray-600">Record all system activities</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.auditSettings.enabled}
                    onChange={e =>
                      updateConfig({
                        auditSettings: {
                          ...config.auditSettings,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Audit Log Retention (days)</label>
                  <input
                    type="number"
                    value={config.auditSettings.retentionDays}
                    onChange={e =>
                      updateConfig({
                        auditSettings: {
                          ...config.auditSettings,
                          retentionDays: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Logging Level</label>
                  <select
                    value={config.auditSettings.logLevel}
                    onChange={e =>
                      updateConfig({
                        auditSettings: {
                          ...config.auditSettings,
                          logLevel: e.target.value as any,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="minimal">Minimal (critical events only)</option>
                    <option value="standard">Standard (recommended)</option>
                    <option value="detailed">Detailed (all operations)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Log Read Operations</h4>
                    <p className="text-sm text-gray-600">Include document/record views in audit log</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.auditSettings.includeReadOperations}
                    onChange={e =>
                      updateConfig({
                        auditSettings: {
                          ...config.auditSettings,
                          includeReadOperations: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeSection === 'security' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Security Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={config.securitySettings.sessionTimeoutMinutes}
                    onChange={e =>
                      updateConfig({
                        securitySettings: {
                          ...config.securitySettings,
                          sessionTimeoutMinutes: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    480 minutes = 8 hours
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Password Expiry (days)</label>
                  <input
                    type="number"
                    value={config.securitySettings.passwordExpiryDays}
                    onChange={e =>
                      updateConfig({
                        securitySettings: {
                          ...config.securitySettings,
                          passwordExpiryDays: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
                  <input
                    type="number"
                    value={config.securitySettings.maxLoginAttempts}
                    onChange={e =>
                      updateConfig({
                        securitySettings: {
                          ...config.securitySettings,
                          maxLoginAttempts: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Account locked after this many failed attempts
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Require Multi-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Enforce MFA for all users</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.securitySettings.requireMFA}
                    onChange={e =>
                      updateConfig({
                        securitySettings: {
                          ...config.securitySettings,
                          requireMFA: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
