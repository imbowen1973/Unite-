import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Examples | Unite',
}

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Unite Platform Examples</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Document Management</h2>
                <p className="text-gray-600 mb-4">Create, approve, and publish documents with full audit trail</p>
                <div className="bg-gray-100 p-4 rounded-md text-sm font-mono mb-2">
                  {/* Example API call */}
                  <div className="text-blue-600">// Create a new document draft</div>
                  <div className="text-green-600">POST /api/documents</div>
                  <div>{'{'}</div>
                  <div className="ml-4">action: 'create',</div>
                  <div className="ml-4">title: 'Policy Document',</div>
                  <div className="ml-4">description: 'New organizational policy',</div>
                  <div className="ml-4">committees: ['standards'],</div>
                  <div className="ml-4">allowedAccessLevels: ['Diplomate', 'CommitteeMember']</div>
                  <div>{'}'}</div>
                </div>
              </div>
              
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Meeting Management</h2>
                <p className="text-gray-600 mb-4">Schedule meetings, manage agendas, and track actions</p>
                <div className="bg-gray-100 p-4 rounded-md text-sm font-mono mb-2">
                  <div className="text-blue-600">// Create a new meeting</div>
                  <div className="text-green-600">POST /api/meetings</div>
                  <div>{'{'}</div>
                  <div className="ml-4">action: 'create',</div>
                  <div className="ml-4">title: 'Standards Committee Meeting',</div>
                  <div className="ml-4">committee: 'standards',</div>
                  <div className="ml-4">scheduledDate: '2023-12-15T10:00:00Z'</div>
                  <div>{'}'}</div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Access Control Levels</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-md">
                  <div className="font-medium text-blue-800">Public</div>
                  <div className="text-sm text-blue-600">Read-only</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-md">
                  <div className="font-medium text-green-800">Diplomate</div>
                  <div className="text-sm text-green-600">Read + History</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-md">
                  <div className="font-medium text-yellow-800">Committee</div>
                  <div className="text-sm text-yellow-600">Read/Write</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-md">
                  <div className="font-medium text-purple-800">Executive</div>
                  <div className="text-sm text-purple-600">Approve/Publish</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-md">
                  <div className="font-medium text-red-800">Admin</div>
                  <div className="text-sm text-red-600">Full Access</div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Document Lifecycle</h2>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-24 p-2 bg-gray-100 rounded text-center">Draft</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-32 p-2 bg-blue-100 rounded text-center">Pending Approval</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-20 p-2 bg-green-100 rounded text-center">Approved</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-20 p-2 bg-indigo-100 rounded text-center">Published</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-20 p-2 bg-red-100 rounded text-center">Redacted</div>
                </div>
                <div className="text-gray-500 mx-4">or</div>
                <div className="flex items-center">
                  <div className="w-24 p-2 bg-red-100 rounded text-center">Rescinded</div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 text-center">Every state transition is audited with tamper-evident hash-chain integrity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
