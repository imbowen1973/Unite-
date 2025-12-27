'use client'

// Meeting Minutes Editor Component
// Interface for editing, reviewing, and exporting meeting minutes

import { useState, useEffect } from 'react'
import {
  FileText,
  Upload,
  Download,
  Check,
  X,
  Plus,
  Edit2,
  Save,
  Send,
  Users,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { MinuteItem, MeetingMinutes, AttendanceRecord } from '@/types/meeting'

interface MinutesEditorProps {
  meetingId: string
  minutesId?: string
  onSave?: () => void
  onApprove?: () => void
  onCirculate?: () => void
}

export function MinutesEditor({
  meetingId,
  minutesId,
  onSave,
  onApprove,
  onCirculate,
}: MinutesEditorProps) {
  const [minutes, setMinutes] = useState<MeetingMinutes | null>(null)
  const [minuteItems, setMinuteItems] = useState<MinuteItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'minutes' | 'attendance' | 'settings'>('minutes')

  const [showTranscriptUpload, setShowTranscriptUpload] = useState(false)
  const [processingTranscript, setProcessingTranscript] = useState(false)

  const [editForm, setEditForm] = useState({
    discussion: '',
    keyPoints: [] as string[],
    decision: '',
  })

  const [attendanceForm, setAttendanceForm] = useState<AttendanceRecord[]>([])

  const [aobForm, setAobForm] = useState({
    title: '',
    discussion: '',
    decision: '',
  })

  useEffect(() => {
    if (meetingId) {
      loadMinutes()
    }
  }, [meetingId, minutesId])

  const loadMinutes = async () => {
    try {
      const response = await fetch(`/api/minutes?meetingId=${meetingId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMinutes(data.minutes)
        setMinuteItems(data.minuteItems || [])
        setAttendanceForm(data.minutes.attendees || [])

        // Auto-expand all items initially
        setExpandedItems(new Set(data.minuteItems?.map((item: MinuteItem) => item.id) || []))
      }
    } catch (error) {
      console.error('Failed to load minutes:', error)
    }
  }

  const handleInitializeMinutes = async () => {
    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'initializeFromAgenda',
          meetingId,
        }),
      })

      if (response.ok) {
        alert('Minutes initialized from agenda!')
        loadMinutes()
      }
    } catch (error) {
      alert('Failed to initialize minutes')
    }
  }

  const handleUploadTranscript = async (file: File) => {
    setProcessingTranscript(true)

    try {
      // Upload transcript file
      const formData = new FormData()
      formData.append('transcript', file)
      formData.append('meetingId', meetingId)

      const uploadResponse = await fetch('/api/minutes/transcript', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload transcript')
      }

      const { transcriptId } = await uploadResponse.json()

      // Process transcript with AI
      const processResponse = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'processTranscript',
          meetingId,
          transcriptId,
        }),
      })

      if (processResponse.ok) {
        alert('Transcript processed successfully! Minutes have been updated with AI-extracted discussions.')
        loadMinutes()
      }
    } catch (error) {
      alert('Failed to process transcript: ' + error)
    } finally {
      setProcessingTranscript(false)
      setShowTranscriptUpload(false)
    }
  }

  const handleEditItem = (item: MinuteItem) => {
    setEditingItemId(item.id)
    setEditForm({
      discussion: item.discussion,
      keyPoints: item.keyPoints || [],
      decision: item.decision || '',
    })
  }

  const handleSaveItem = async (itemId: string) => {
    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'updateMinuteItem',
          minuteItemId: itemId,
          ...editForm,
        }),
      })

      if (response.ok) {
        setEditingItemId(null)
        loadMinutes()
      }
    } catch (error) {
      alert('Failed to save changes')
    }
  }

  const handleAddKeyPoint = () => {
    setEditForm({
      ...editForm,
      keyPoints: [...editForm.keyPoints, ''],
    })
  }

  const handleUpdateKeyPoint = (index: number, value: string) => {
    const updated = [...editForm.keyPoints]
    updated[index] = value
    setEditForm({ ...editForm, keyPoints: updated })
  }

  const handleRemoveKeyPoint = (index: number) => {
    const updated = editForm.keyPoints.filter((_, i) => i !== index)
    setEditForm({ ...editForm, keyPoints: updated })
  }

  const handleAddAobItem = async () => {
    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'addAobItem',
          meetingId,
          ...aobForm,
        }),
      })

      if (response.ok) {
        setAobForm({ title: '', discussion: '', decision: '' })
        loadMinutes()
      }
    } catch (error) {
      alert('Failed to add AoB item')
    }
  }

  const handleUpdateAttendance = async () => {
    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'updateAttendance',
          minutesId: minutes?.id,
          attendees: attendanceForm.filter(a => a.status === 'present'),
          apologies: attendanceForm.filter(a => a.status === 'apologies').map(a => a.displayName),
          absent: attendanceForm.filter(a => a.status === 'absent').map(a => a.displayName),
        }),
      })

      if (response.ok) {
        alert('Attendance updated!')
        loadMinutes()
      }
    } catch (error) {
      alert('Failed to update attendance')
    }
  }

  const handleGeneratePDF = async () => {
    try {
      const response = await fetch('/api/minutes/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          minutesId: minutes?.id,
          options: {
            includeActions: true,
            includeVotingResults: true,
            format: 'standard',
            letterhead: true,
          },
        }),
      })

      if (response.ok) {
        const { pdfUrl } = await response.json()
        window.open(pdfUrl, '_blank')
      }
    } catch (error) {
      alert('Failed to generate PDF')
    }
  }

  const handleApproveMinutes = async () => {
    if (!confirm('Are you sure you want to approve these minutes? They will be locked from further edits.')) {
      return
    }

    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'approveMinutes',
          minutesId: minutes?.id,
        }),
      })

      if (response.ok) {
        alert('Minutes approved!')
        loadMinutes()
        onApprove?.()
      }
    } catch (error) {
      alert('Failed to approve minutes')
    }
  }

  const handleCirculateMinutes = async () => {
    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'circulateMinutes',
          minutesId: minutes?.id,
        }),
      })

      if (response.ok) {
        alert('Minutes circulated to attendees!')
        loadMinutes()
        onCirculate?.()
      }
    } catch (error) {
      alert('Failed to circulate minutes')
    }
  }

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  if (!minutes) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Minutes Yet</h3>
          <p className="text-gray-600 mb-4">Initialize minutes from the finalized agenda</p>
          <button
            onClick={handleInitializeMinutes}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Initialize Minutes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{minutes.meetingTitle} - Minutes</h2>
            <p className="text-gray-600 mt-1">
              {new Date(minutes.meetingDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTranscriptUpload(true)}
              className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50"
              title="Upload transcript for AI processing"
            >
              <Sparkles className="w-4 h-4" />
              <Upload className="w-4 h-4" />
              AI Extract
            </button>
            <button
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            {minutes.status === 'draft' && (
              <>
                <button
                  onClick={handleCirculateMinutes}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Send className="w-4 h-4" />
                  Circulate
                </button>
                <button
                  onClick={handleApproveMinutes}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 text-sm">
          <span className={`px-3 py-1 rounded-full ${
            minutes.status === 'approved' ? 'bg-green-100 text-green-700' :
            minutes.status === 'circulated' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {minutes.status.toUpperCase()}
          </span>
          <span className="text-gray-600">Version {minutes.version}</span>
          {minutes.approvedBy && (
            <span className="text-gray-600">Approved by {minutes.approvedBy}</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b">
          <button
            onClick={() => setActiveTab('minutes')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'minutes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Minutes
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'attendance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Attendance
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'minutes' && (
          <div className="space-y-4">
            {/* Minute Items */}
            {minuteItems.map(item => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                style={{ marginLeft: `${item.level * 24}px` }}
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="flex items-center gap-2 text-left w-full"
                    >
                      {expandedItems.has(item.id) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="text-gray-500 font-mono">{item.orderPath}.</span>
                      <span className="font-semibold text-lg">{item.agendaTitle}</span>
                    </button>
                    {item.agendaPurpose && (
                      <p className="text-sm text-gray-600 mt-1 ml-7">{item.agendaPurpose}</p>
                    )}
                  </div>

                  {minutes.status === 'draft' && (
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Item Content (Expanded) */}
                {expandedItems.has(item.id) && (
                  <div className="ml-7 space-y-3">
                    {editingItemId === item.id ? (
                      /* Edit Mode */
                      <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium mb-1">Discussion</label>
                          <textarea
                            value={editForm.discussion}
                            onChange={e => setEditForm({ ...editForm, discussion: e.target.value })}
                            placeholder="Record the discussion for this agenda item..."
                            className="w-full px-3 py-2 border rounded-md"
                            rows={6}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Key Points</label>
                          {editForm.keyPoints.map((point, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={point}
                                onChange={e => handleUpdateKeyPoint(index, e.target.value)}
                                placeholder="Key point..."
                                className="flex-1 px-3 py-2 border rounded-md text-sm"
                              />
                              <button
                                onClick={() => handleRemoveKeyPoint(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={handleAddKeyPoint}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add Key Point
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Decision/Outcome</label>
                          <textarea
                            value={editForm.decision}
                            onChange={e => setEditForm({ ...editForm, decision: e.target.value })}
                            placeholder="Final decision or outcome..."
                            className="w-full px-3 py-2 border rounded-md"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveItem(item.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="px-4 py-2 border rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <>
                        {item.presenters && item.presenters.length > 0 && (
                          <div className="text-sm">
                            <strong>Presented by:</strong> {item.presenters.join(', ')}
                          </div>
                        )}

                        {item.discussion ? (
                          <div>
                            <strong className="text-sm">Discussion:</strong>
                            <p className="mt-1 text-gray-700 whitespace-pre-wrap">{item.discussion}</p>
                          </div>
                        ) : (
                          <div className="text-gray-500 italic text-sm">No discussion recorded yet</div>
                        )}

                        {item.keyPoints && item.keyPoints.length > 0 && (
                          <div>
                            <strong className="text-sm">Key Points:</strong>
                            <ul className="list-disc list-inside mt-1 text-gray-700">
                              {item.keyPoints.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.decision && (
                          <div className="bg-green-50 p-3 rounded border-l-3 border-green-500">
                            <strong className="text-sm">Decision:</strong>
                            <p className="mt-1 text-gray-700">{item.decision}</p>
                          </div>
                        )}

                        {item.votingResult && (
                          <div className="bg-orange-50 p-3 rounded border-l-3 border-orange-500">
                            <strong className="text-sm">Voting Result:</strong>
                            <p className="mt-1">{item.votingResult.outcome}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              For: {item.votingResult.votesFor}, Against: {item.votingResult.votesAgainst}, Abstentions: {item.votingResult.abstentions}
                            </p>
                          </div>
                        )}

                        {item.transcriptSegment && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              View AI-extracted transcript segment
                            </summary>
                            <div className="mt-2 bg-gray-50 p-3 rounded text-xs">
                              <p className="text-gray-600 mb-2">
                                {item.transcriptSegment.startTime} - {item.transcriptSegment.endTime}
                                {item.transcriptSegment.confidenceScore && (
                                  <span className="ml-2">(Confidence: {item.transcriptSegment.confidenceScore}%)</span>
                                )}
                              </p>
                              <div className="whitespace-pre-wrap">{item.transcriptSegment.transcriptText}</div>
                            </div>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add AoB */}
            {minutes.status === 'draft' && (
              <div className="border border-dashed rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-3">Add Any Other Business (AoB)</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={aobForm.title}
                    onChange={e => setAobForm({ ...aobForm, title: e.target.value })}
                    placeholder="AoB item title..."
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <textarea
                    value={aobForm.discussion}
                    onChange={e => setAobForm({ ...aobForm, discussion: e.target.value })}
                    placeholder="Discussion..."
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                  <textarea
                    value={aobForm.decision}
                    onChange={e => setAobForm({ ...aobForm, decision: e.target.value })}
                    placeholder="Decision/outcome (optional)..."
                    className="w-full px-3 py-2 border rounded-md"
                    rows={2}
                  />
                  <button
                    onClick={handleAddAobItem}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4" />
                    Add AoB Item
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Attendance Records</h3>
            <div className="space-y-3">
              {attendanceForm.map((attendee, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{attendee.displayName}</div>
                    <div className="text-sm text-gray-600">{attendee.email}</div>
                  </div>
                  <select
                    value={attendee.status}
                    onChange={e => {
                      const updated = [...attendanceForm]
                      updated[index].status = e.target.value as any
                      setAttendanceForm(updated)
                    }}
                    className="px-3 py-2 border rounded-md"
                    disabled={minutes.status !== 'draft'}
                  >
                    <option value="present">Present</option>
                    <option value="apologies">Apologies</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>
              ))}
            </div>
            {minutes.status === 'draft' && (
              <button
                onClick={handleUpdateAttendance}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save Attendance
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transcript Upload Modal */}
      {showTranscriptUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Upload Meeting Transcript</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a transcript file (.txt, .vtt, .srt) and AI will extract discussion for each agenda item.
            </p>
            <input
              type="file"
              accept=".txt,.vtt,.srt"
              onChange={e => {
                if (e.target.files?.[0]) {
                  handleUploadTranscript(e.target.files[0])
                }
              }}
              className="w-full mb-4"
              disabled={processingTranscript}
            />
            {processingTranscript && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing transcript with AI...</p>
              </div>
            )}
            <button
              onClick={() => setShowTranscriptUpload(false)}
              className="w-full px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={processingTranscript}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
