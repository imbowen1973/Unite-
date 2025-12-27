'use client'

// DMS Admin Tool - Comprehensive Administration Interface
// Manages DMS libraries, meeting templates, committees, and system configuration

import { useState } from 'react'
import {
  Database,
  Calendar,
  Users,
  Settings,
  FileText,
  Shield,
  Bell,
  BarChart,
} from 'lucide-react'

import { DMSLibraryManager } from '@/components/admin/DMSLibraryManager'
import { MeetingTemplateManager } from '@/components/admin/MeetingTemplateManager'
import { CommitteeManager } from '@/components/admin/CommitteeManager'
import { SystemSettings } from '@/components/admin/SystemSettings'

type TabId = 'dms' | 'templates' | 'committees' | 'settings'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dms')

  const tabs = [
    {
      id: 'dms' as TabId,
      label: 'DMS Libraries',
      icon: Database,
      description: 'Manage document libraries and site collections',
    },
    {
      id: 'templates' as TabId,
      label: 'Meeting Templates',
      icon: Calendar,
      description: 'Create and manage meeting templates',
    },
    {
      id: 'committees' as TabId,
      label: 'Committees & Groups',
      icon: Users,
      description: 'Configure committees and access groups',
    },
    {
      id: 'settings' as TabId,
      label: 'System Settings',
      icon: Settings,
      description: 'Platform configuration and preferences',
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Unite Platform Administration</h1>
          <p className="text-gray-600 mt-1">
            Configure document management, meetings, committees, and system settings
          </p>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="flex gap-1 border-b">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-3 border-b-2 transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'dms' && <DMSLibraryManager />}
        {activeTab === 'templates' && <MeetingTemplateManager />}
        {activeTab === 'committees' && <CommitteeManager />}
        {activeTab === 'settings' && <SystemSettings />}
      </div>
    </div>
  )
}
