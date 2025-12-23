import { useState } from 'react'

interface User {
  id: string
  displayName: string
  email: string
  department: string
  role: string
  committees: string[]
  isActive: boolean
}

export default function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([
    { id: '1', displayName: 'John Doe', email: 'john@example.com', department: 'Engineering', role: 'Admin', committees: ['Standards', 'Technical'], isActive: true },
    { id: '2', displayName: 'Jane Smith', email: 'jane@example.com', department: 'Legal', role: 'Executive', committees: ['Governance', 'Standards'], isActive: true },
    { id: '3', displayName: 'Bob Johnson', email: 'bob@example.com', department: 'Operations', role: 'Diplomate', committees: ['Operations'], isActive: true }
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
          Add User
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-blue-600 truncate">{user.displayName}</div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <div className="mr-6 text-sm text-gray-500">{user.email}</div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {user.department}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-medium">Committees:</span> {user.committees.join(', ')}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
