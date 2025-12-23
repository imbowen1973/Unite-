import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meeting Management | Unite',
}

export default function MeetingManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Meeting Management System</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Meeting Features</h2>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>Create meetings with agendas and associated documents</li>
                  <li>Flexible permissions for viewing before publishing</li>
                  <li>Meeting pack creation and approval workflow</li>
                  <li>AI-powered transcript processing and summarization</li>
                  <li>Action item creation and assignment via Microsoft Planner</li>
                  <li>Automatic agenda creation for next meetings with matters arising</li>
                </ul>
              </div>
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Integration Capabilities</h2>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>Microsoft 365 integration (Word, PowerPoint, Teams)</li>
                  <li>Microsoft Planner for task assignment</li>
                  <li>AI summarization of meeting transcripts</li>
                  <li>Document management with SharePoint</li>
                  <li>Comprehensive audit trail for all actions</li>
                  <li>Role-based access control</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 border rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Meeting Workflow</h2>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-24 p-2 bg-gray-100 rounded text-center">Draft</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-32 p-2 bg-blue-100 rounded text-center">Agenda Creation</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-32 p-2 bg-yellow-100 rounded text-center">Document Upload</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-32 p-2 bg-purple-100 rounded text-center">Pack Approval</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24 p-2 bg-green-100 rounded text-center">Publish</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24 p-2 bg-indigo-100 rounded text-center">Meeting</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-32 p-2 bg-blue-100 rounded text-center">Transcript Processing</div>
                  <div className="text-gray-500 mx-2">→</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24 p-2 bg-red-100 rounded text-center">Actions</div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 text-center">Each step in the workflow is audited with tamper-evident hash-chain integrity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
