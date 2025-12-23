import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meeting Dashboard | Unite',
}

export default function MeetingDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Meeting Management Dashboard</h1>
            
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
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed Meetings</dt>
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
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Votes</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">5</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Current Meeting Agenda</h2>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-3 bg-gray-50 rounded-md border-l-4 border-blue-500">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">Opening Remarks</div>
                      <div className="text-sm text-gray-500">Time: 5 min • Presented by: CEO</div>
                    </div>
                    <div className="flex space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Completed
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between p-3 bg-gray-50 rounded-md border-l-4 border-green-500">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">Q4 Financial Report</div>
                      <div className="text-sm text-gray-500">Time: 15 min • Presented by: CFO</div>
                      <div className="text-xs text-gray-500 mt-1">Supporting docs: Financials Q4, Budget Analysis</div>
                    </div>
                    <div className="flex space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Progress
                      </span>
                      <button className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">
                        Vote
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between p-3 bg-gray-50 rounded-md border-l-4 border-purple-500">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">New Policy Review</div>
                      <div className="text-sm text-gray-500">Time: 20 min • Presented by: HR Director</div>
                      <div className="text-xs text-gray-500 mt-1">Supporting docs: Policy Draft v3, Compliance Checklist</div>
                    </div>
                    <div className="flex space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                      <button className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">
                        Vote
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between p-3 bg-gray-50 rounded-md border-l-4 border-gray-500">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">Next Quarter Planning</div>
                      <div className="text-sm text-gray-500">Time: 25 min • Presented by: Operations</div>
                    </div>
                    <div className="flex space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Meeting Actions & Outcomes</h2>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-md border-l-4 border-green-500">
                    <div className="font-medium text-green-800">Q4 Budget Approved</div>
                    <div className="text-sm text-green-700 mt-1">Vote: 8 Yes, 2 No, 1 Abstain • Outcome: Passed</div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-500">
                    <div className="font-medium text-blue-800">Action: Update Policy Manual</div>
                    <div className="text-sm text-blue-700 mt-1">Assigned to: HR Team • Due: Jan 15, 2024</div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-md border-l-4 border-yellow-500">
                    <div className="font-medium text-yellow-800">Opinion: Continue Discussion on Remote Work</div>
                    <div className="text-sm text-yellow-700 mt-1">70% in favor of continuing • Topic deferred to next meeting</div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-md border-l-4 border-gray-500">
                    <div className="font-medium text-gray-800">Action: Prepare Q1 Forecast</div>
                    <div className="text-sm text-gray-700 mt-1">Assigned to: Finance Team • Due: Feb 1, 2024</div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Voting Patterns & Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border rounded-md">
                  <h3 className="font-medium text-gray-900 mb-2">Voting Participation</h3>
                  <div className="text-3xl font-bold text-blue-600">87%</div>
                  <div className="text-sm text-gray-500">of eligible voters participated</div>
                </div>
                
                <div className="p-4 bg-white border rounded-md">
                  <h3 className="font-medium text-gray-900 mb-2">Consensus Level</h3>
                  <div className="text-3xl font-bold text-green-600">78%</div>
                  <div className="text-sm text-gray-500">average agreement rate</div>
                </div>
                
                <div className="p-4 bg-white border rounded-md">
                  <h3 className="font-medium text-gray-900 mb-2">Decision Speed</h3>
                  <div className="text-3xl font-bold text-purple-600">2.3d</div>
                  <div className="text-sm text-gray-500">avg. days to finalize</div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p>Voting patterns are securely maintained and only accessible to site administrators with full audit logging.</p>
                <p className="mt-1">Individual voting records are private and not disclosed to maintain democratic process integrity.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
