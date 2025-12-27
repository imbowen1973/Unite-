'use client'

// Committee and Group Management Component
// Interface for managing committees, groups, and their memberships

import { useState } from 'react'
import { Users, Plus, Settings, Trash2, UserPlus, UserMinus, Shield } from 'lucide-react'

interface Committee {
  id: string
  name: string
  description: string
  type: 'board' | 'committee' | 'working-group' | 'ad-hoc'
  chairperson?: string
  members: CommitteeMember[]
  permissions: string[]
  meetingFrequency?: string
  isActive: boolean
  createdAt: string
}

interface CommitteeMember {
  userId: string
  displayName: string
  email: string
  role: 'Chair' | 'Member' | 'Secretary' | 'Observer'
  joinedAt: string
}

export function CommitteeManager() {
  const [committees, setCommittees] = useState<Committee[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null)
  const [showMemberForm, setShowMemberForm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'committee' as 'board' | 'committee' | 'working-group' | 'ad-hoc',
    chairperson: '',
    meetingFrequency: '',
    permissions: [] as string[],
  })

  const [memberFormData, setMemberFormData] = useState({
    userId: '',
    displayName: '',
    email: '',
    role: 'Member' as 'Chair' | 'Member' | 'Secretary' | 'Observer',
  })

  const handleCreateCommittee = async () => {
    try {
      const response = await fetch('/api/committees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'create',
          ...formData,
        }),
      })

      if (response.ok) {
        alert('Committee created successfully!')
        setShowCreateForm(false)
        setFormData({
          name: '',
          description: '',
          type: 'committee',
          chairperson: '',
          meetingFrequency: '',
          permissions: [],
        })
        // Refresh committees list
      }
    } catch (error) {
      alert('Error creating committee')
    }
  }

  const handleAddMember = async () => {
    if (!selectedCommittee) return

    try {
      const response = await fetch('/api/committees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'addMember',
          committeeId: selectedCommittee.id,
          ...memberFormData,
        }),
      })

      if (response.ok) {
        alert('Member added successfully!')
        setShowMemberForm(false)
        setMemberFormData({
          userId: '',
          displayName: '',
          email: '',
          role: 'Member',
        })
        // Refresh committee details
      }
    } catch (error) {
      alert('Error adding member')
    }
  }

  const handleRemoveMember = async (committeeId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch('/api/committees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'removeMember',
          committeeId,
          userId,
        }),
      })

      if (response.ok) {
        alert('Member removed successfully!')
        // Refresh committee details
      }
    } catch (error) {
      alert('Error removing member')
    }
  }

  const availablePermissions = [
    'view_documents',
    'create_documents',
    'edit_documents',
    'approve_documents',
    'manage_meetings',
    'vote',
    'view_audit_log',
  ]

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - Committees List */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-6 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Committees & Groups</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Committee
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium mb-3">Create New Committee</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Academic Standards Committee"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Purpose and responsibilities"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="board">Board</option>
                    <option value="committee">Committee</option>
                    <option value="working-group">Working Group</option>
                    <option value="ad-hoc">Ad-hoc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Meeting Frequency</label>
                  <input
                    type="text"
                    value={formData.meetingFrequency}
                    onChange={e => setFormData({ ...formData, meetingFrequency: e.target.value })}
                    placeholder="e.g., Monthly, Quarterly"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Permissions</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                    {availablePermissions.map(perm => (
                      <label key={perm} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData({ ...formData, permissions: [...formData.permissions, perm] })
                            } else {
                              setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm) })
                            }
                          }}
                        />
                        {perm.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreateCommittee}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                >
                  Create Committee
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Committees List */}
        <div className="flex-1 overflow-y-auto p-4">
          {committees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">No committees yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {committees.map(committee => (
                <div
                  key={committee.id}
                  onClick={() => setSelectedCommittee(committee)}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedCommittee?.id === committee.id ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{committee.name}</h3>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{committee.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          {committee.type}
                        </span>
                        <span>{committee.members.length} members</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Committee Details */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedCommittee ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Committee Selected</h3>
              <p className="text-gray-600">Select a committee from the list to view details</p>
            </div>
          </div>
        ) : (
          <>
            {/* Committee Header */}
            <div className="p-6 bg-white border-b">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{selectedCommittee.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedCommittee.description}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium capitalize">{selectedCommittee.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Members:</span>
                  <span className="ml-2 font-medium">{selectedCommittee.members.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Frequency:</span>
                  <span className="ml-2 font-medium">{selectedCommittee.meetingFrequency || 'Not set'}</span>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Members</h3>
                <button
                  onClick={() => setShowMemberForm(!showMemberForm)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </button>
              </div>

              {/* Add Member Form */}
              {showMemberForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium mb-3">Add New Member</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={memberFormData.displayName}
                        onChange={e => setMemberFormData({ ...memberFormData, displayName: e.target.value })}
                        placeholder="Full name"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={memberFormData.email}
                        onChange={e => setMemberFormData({ ...memberFormData, email: e.target.value })}
                        placeholder="email@university.ac.uk"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Role</label>
                      <select
                        value={memberFormData.role}
                        onChange={e => setMemberFormData({ ...memberFormData, role: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="Member">Member</option>
                        <option value="Chair">Chair</option>
                        <option value="Secretary">Secretary</option>
                        <option value="Observer">Observer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddMember}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                    >
                      Add Member
                    </button>
                    <button
                      onClick={() => setShowMemberForm(false)}
                      className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {selectedCommittee.members.map(member => (
                  <div key={member.userId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {member.displayName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{member.displayName}</h4>
                        <p className="text-xs text-gray-600">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                        {member.role}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(selectedCommittee.id, member.userId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Permissions Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Permissions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCommittee.permissions.map(permission => (
                    <div key={permission} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-sm capitalize">{permission.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
