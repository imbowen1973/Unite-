import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Unite',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Unite Governance Platform</h1>
            <p className="text-gray-600 mb-6">
              A headless governance platform ensuring compliance with ISO 27001 standards.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Document Management</h2>
                <p className="text-gray-600">Controlled document workflows with audit trail</p>
              </div>
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Meeting Engine</h2>
                <p className="text-gray-600">Agenda builder and board pack generation</p>
              </div>
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Appeals Workspace</h2>
                <p className="text-gray-600">Secure, isolated case management</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
