import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Executive Dashboard | Unite',
}

export default function ExecutiveDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Executive Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Meetings</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">3</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed Actions</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">12</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Actions</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">7</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Meetings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">Board Meeting</div>
                      <div className="text-sm text-gray-500">Dec 20, 2023 • 10:00 AM</div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">Executive Committee</div>
                      <div className="text-sm text-gray-500">Dec 22, 2023 • 2:00 PM</div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Published
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">Standards Committee</div>
                      <div className="text-sm text-gray-500">Jan 5, 2024 • 9:00 AM</div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Scheduled
                    </span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Assigned Tasks (from Planner)</h2>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium text-gray-900">Q4 Financial Report</div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        High Priority
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Due: Jan 15, 2024</div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium text-gray-900">Prepare Board Agenda</div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Medium Priority
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Due: Jan 10, 2024</div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium text-gray-900">Review Governance Policy</div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Low Priority
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Due: Feb 1, 2024</div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">AI-Processed Meeting Insights</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="font-medium text-blue-800 mb-2">Recent Meeting Summary</h3>
                <p className="text-blue-700 text-sm">The AI has processed the latest meeting transcript and identified 3 key decisions, 5 action items, and 2 topics requiring follow-up. Action items have been automatically created in Microsoft Planner and assigned to responsible parties.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
