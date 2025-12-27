'use client'

// Temporary Appellant Workflow
// Allows temporary appellants to upload documents, finalize appeal, and submit
// Account automatically disabled and deleted after appeal finalized

import { useState, useEffect } from 'react'
import { Upload, FileText, Check, AlertCircle, Clock, Trash2, Download, Send } from 'lucide-react'
import { GuestUser, AppellantInfo } from '@/types/onboarding'
import { Appeal, AppealDocument, AppealSubmission } from '@/types/appeal'

interface AppellantWorkflowProps {
  guestUser: GuestUser
  onComplete?: () => void
}

export function AppellantWorkflow({ guestUser, onComplete }: AppellantWorkflowProps) {
  const [appeal, setAppeal] = useState<Appeal | null>(null)
  const [documents, setDocuments] = useState<AppealDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<'upload' | 'review' | 'submit' | 'confirmation'>('upload')
  const [agreedToDeclaration, setAgreedToDeclaration] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submission, setSubmission] = useState<AppealSubmission | null>(null)

  const appellantInfo = guestUser.appellantInfo!

  useEffect(() => {
    loadAppeal()
  }, [appellantInfo.appealId])

  const loadAppeal = async () => {
    try {
      const response = await fetch(`/api/appeals/${appellantInfo.appealId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (response.ok) {
        const data = await response.json()
        setAppeal(data.appeal)
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load appeal:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('appealId', appellantInfo.appealId)
      formData.append('documentType', documentType)

      const response = await fetch('/api/appeals/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      })

      if (response.ok) {
        await loadAppeal()
        alert('Document uploaded successfully!')
      } else {
        alert('Failed to upload document')
      }
    } catch (error) {
      alert('Error uploading document')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/appeals/documents/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })

      if (response.ok) {
        await loadAppeal()
        alert('Document deleted')
      }
    } catch (error) {
      alert('Failed to delete document')
    }
  }

  const handleSubmitAppeal = async () => {
    if (!agreedToDeclaration) {
      alert('Please agree to the declaration to submit your appeal')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/appeals/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          appealId: appellantInfo.appealId,
          guestUserId: guestUser.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSubmission(data.submission)
        setStep('confirmation')
      } else {
        alert('Failed to submit appeal')
      }
    } catch (error) {
      alert('Error submitting appeal')
    } finally {
      setSubmitting(false)
    }
  }

  if (!appeal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Calculate days until access expires
  const daysRemaining = Math.ceil(
    (new Date(appellantInfo.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with expiry warning */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appeal Submission</h1>
        <p className="text-gray-600">Reference: {appellantInfo.appealReference}</p>

        {/* Expiry warning */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-yellow-700 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-900">
                Your access expires in {daysRemaining} days
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Access until: {new Date(appellantInfo.accessExpiresAt).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Auto-deletion notice */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Important: Temporary Access Account</p>
              <p className="text-blue-800">
                Your account will be <strong>automatically disabled and deleted</strong> once your appeal is finalized.
                Please download any confirmation documents before this happens. An anonymized record of your submission will be retained for audit purposes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Your Appeal Documents</h2>
            <p className="text-gray-600 mb-6">
              Please upload all required documents to support your appeal. You can upload multiple files.
            </p>
          </div>

          {/* Required documents */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Required Documents</h3>
            <div className="space-y-4">
              {appeal.requiredDocuments?.map(docType => {
                const uploaded = documents.find(d => d.documentType === docType && d.status !== 'rejected')
                return (
                  <div
                    key={docType}
                    className={`p-4 border-2 rounded-lg ${
                      uploaded ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium capitalize">{docType.replace(/-/g, ' ')}</h4>
                          {uploaded && <Check className="w-5 h-5 text-green-600" />}
                        </div>
                        {uploaded ? (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileText className="w-4 h-4" />
                              <span>{uploaded.fileName}</span>
                              <span className="text-xs">
                                ({(uploaded.fileSize / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(uploaded.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>Upload</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={e => handleFileUpload(e, docType)}
                              disabled={uploading}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Additional documents */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Additional Supporting Documents (Optional)</h3>
            <div className="space-y-3">
              {documents.filter(d => !appeal.requiredDocuments?.includes(d.documentType)).map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-sm">{doc.fileName}</p>
                      <p className="text-xs text-gray-600">
                        {doc.documentType.replace(/-/g, ' ')} • {(doc.fileSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Add Another Document</span>
              <input
                type="file"
                className="hidden"
                onChange={e => handleFileUpload(e, 'other')}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Navigation */}
          <div className="flex justify-end">
            <button
              onClick={() => setStep('review')}
              disabled={
                !appeal.requiredDocuments?.every(docType =>
                  documents.some(d => d.documentType === docType && d.status !== 'rejected')
                )
              }
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Review & Submit
            </button>
          </div>
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Review Your Submission</h2>
            <p className="text-gray-600">
              Please review all uploaded documents before submitting your appeal.
            </p>
          </div>

          {/* Documents summary */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Uploaded Documents ({documents.length})</h3>
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-sm">{doc.fileName}</p>
                      <p className="text-xs text-gray-600">
                        {doc.documentType.replace(/-/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Declaration */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Declaration</h3>
            <div className="bg-gray-50 p-4 rounded mb-4 text-sm">
              <p className="mb-2">I declare that:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>All information provided is true and accurate to the best of my knowledge</li>
                <li>All uploaded documents are genuine and unaltered</li>
                <li>I understand that providing false information may result in rejection of my appeal</li>
                <li>I consent to the processing of my personal data for the purpose of this appeal</li>
                <li>I understand my account will be deleted after the appeal is finalized</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToDeclaration}
                onChange={e => setAgreedToDeclaration(e.target.checked)}
                className="w-5 h-5 mt-0.5"
              />
              <span className="text-sm">
                I have read and agree to the declaration above
              </span>
            </label>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-3 border rounded-md hover:bg-gray-50"
            >
              Back to Documents
            </button>
            <button
              onClick={handleSubmitAppeal}
              disabled={!agreedToDeclaration || submitting}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {submitting ? 'Submitting...' : 'Submit Appeal'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Step */}
      {step === 'confirmation' && submission && (
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appeal Submitted Successfully!</h2>
          <p className="text-lg text-gray-600 mb-6">
            Your appeal has been received and will be reviewed.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold mb-3">Confirmation Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Reference:</dt>
                <dd className="font-mono font-medium">{submission.confirmationReference}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Submitted:</dt>
                <dd className="font-medium">
                  {new Date(submission.submittedAt).toLocaleString('en-GB')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Documents:</dt>
                <dd className="font-medium">{submission.documentIds.length} files</dd>
              </div>
            </dl>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-700 flex-shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-red-900 mb-2">Important: Account Deletion Notice</p>
                <p className="text-sm text-red-800">
                  Your temporary account will be <strong>automatically disabled and deleted</strong> once your appeal is finalized by the review panel.
                  You will receive a final email notification before deletion. Please save this confirmation page and any reference numbers now.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-6">
            <p>A confirmation email has been sent to: <strong>{guestUser.email}</strong></p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-6 py-3 border rounded-md hover:bg-gray-50 mb-4"
          >
            <Download className="inline w-5 h-5 mr-2" />
            Print Confirmation
          </button>

          <p className="text-sm text-gray-500 mt-6">
            You will be notified by email about the progress of your appeal.
          </p>
        </div>
      )}
    </div>
  )
}
