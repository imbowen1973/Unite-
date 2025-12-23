import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard | Unite',
}

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Dashboard Overview</h2>
                <p className="text-gray-600 mb-4">This is a placeholder for the admin dashboard. The actual dashboard would include user management, library management, meeting management, document management, and document lifecycle tracking.</p>
                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
                  <p>Dashboard components would be loaded here based on user role (admin or executive).</p>
                </div>
              </div>
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Key Features</h2>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>User Management: Create, edit, and manage users and permissions</li>
                  <li>Library Management: Create new SharePoint libraries for different purposes</li>
                  <li>Meeting Management: Schedule meetings and track action items</li>
                  <li>Document Management: Create and manage documents across the organization</li>
                  <li>Document Lifecycle: Monitor documents needing approval, review, or rescinding</li>
                  <li>Executive Tasks: View tasks assigned from Microsoft Planner</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
