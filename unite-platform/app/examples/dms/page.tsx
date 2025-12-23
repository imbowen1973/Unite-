import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DMS System Overview | Unite',
}

export default function DMSOverviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Unite DMS System Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Document Management</h2>
                <p className="text-gray-600 mb-4">Documents are stored across multiple site libraries with DMS catalogue tracking</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Core Documents:</span>
                    <span className="text-blue-600">unite-docs site</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Appeals Documents:</span>
                    <span className="text-blue-600">unite-appeal-[id] sites</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">System Settings:</span>
                    <span className="text-blue-600">unite-core site</span>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Audit Chain Integrity</h2>
                <p className="text-gray-600 mb-4">All actions are hashed and linked for tamper-evident audit logs</p>
                <div className="bg-gray-100 p-4 rounded-md text-xs font-mono">
                  <div className="text-blue-600">// Hash Chain Verification</div>
                  <div>currentHash = SHA256(action + actor + payload + previousHash)</div>
                  <div>verify(currentHash === storedHash)</div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">DMS Catalogue System</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-md">
                  <div className="font-medium text-blue-800">Document Registration</div>
                  <div className="text-sm text-blue-600 mt-2">docStableId → Site Collection → Library → Item ID</div>
                </div>
                <div className="p-4 bg-green-50 rounded-md">
                  <div className="font-medium text-green-800">State Management</div>
                  <div className="text-sm text-green-600 mt-2">Draft → Pending Approval → Approved → Published → Redacted/Rescinded</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-md">
                  <div className="font-medium text-purple-800">Isolated Libraries</div>
                  <div className="text-sm text-purple-600 mt-2">Appeals get dedicated site collections</div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Site Collection Structure</h2>
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="w-32 font-medium">unite-core</div>
                  <div className="flex-1 text-sm text-gray-600">System settings, audit logs, chain heads</div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="w-32 font-medium">unite-docs</div>
                  <div className="flex-1 text-sm text-gray-600">Core documents and workflows</div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="w-32 font-medium">unite-appeals</div>
                  <div className="flex-1 text-sm text-gray-600">Appeal index and provisioning control</div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="w-32 font-medium">unite-case-[id]</div>
                  <div className="flex-1 text-sm text-gray-600">Specific appeal evidence (isolated)</div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 text-center">Each action across all sites is logged to the DMS audit system with hash-chain integrity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
