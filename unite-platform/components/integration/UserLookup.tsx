// User Lookup Component for Unite Platform
'use client';

import React, { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  displayName: string;
  email: string;
  committees?: string[];
  accessLevel?: string;
}

interface UserLookupProps {
  onSelect: (user: User) => void;
  placeholder?: string;
  committee?: string;
  accessLevel?: string;
  maxResults?: number;
  allowMultiple?: boolean;
  disabled?: boolean;
  teamSize?: 'small' | 'medium' | 'large';
  label?: string;
}

const UserLookup: React.FC<UserLookupProps> = ({
  onSelect,
  placeholder = 'Search for users...',
  committee,
  accessLevel,
  maxResults = 10,
  allowMultiple = false,
  disabled = false,
  teamSize = 'medium',
  label = 'Assign to user'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load users based on search term and filters
  useEffect(() => {
    const loadUsers = async () => {
      if (!searchTerm && teamSize !== 'small') return; // Don't load all users by default for medium/large teams
      
      setLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock data based on search term
        const mockUsers: User[] = [
          { id: '1', displayName: 'John Smith', email: 'john.smith@company.com', committees: ['executive', 'finance'], accessLevel: 'Executive' },
          { id: '2', displayName: 'Sarah Johnson', email: 'sarah.johnson@company.com', committees: ['operations', 'hr'], accessLevel: 'Admin' },
          { id: '3', displayName: 'Michael Chen', email: 'michael.chen@company.com', committees: ['technology'], accessLevel: 'CommitteeMember' },
          { id: '4', displayName: 'Emily Williams', email: 'emily.williams@company.com', committees: ['executive', 'marketing'], accessLevel: 'Executive' },
          { id: '5', displayName: 'David Brown', email: 'david.brown@company.com', committees: ['finance'], accessLevel: 'CommitteeMember' },
        ].filter(user => 
          user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setResults(mockUsers);
      } catch (err) {
        setError('Failed to load users');
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    };

    if (teamSize === 'small' || searchTerm.length >= 2) {
      loadUsers();
    } else {
      setResults([]);
    }
  }, [searchTerm, committee, accessLevel, maxResults, teamSize]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (user: User) => {
    if (allowMultiple) {
      if (!selectedUsers.some(u => u.id === user.id)) {
        const newSelected = [...selectedUsers, user];
        setSelectedUsers(newSelected);
        onSelect(user); // This passes the newly added user
      }
    } else {
      setSelectedUsers([user]);
      onSelect(user);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleRemove = (userId: string) => {
    const newSelected = selectedUsers.filter(user => user.id !== userId);
    setSelectedUsers(newSelected);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length >= 2 || teamSize === 'small') {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    if (teamSize === 'small') {
      setIsOpen(true);
      if (searchTerm === '') {
        // Load all users for small teams when input is focused
        setSearchTerm('*'); // Special term to load all
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {allowMultiple && selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedUsers.map(user => (
              <div 
                key={user.id} 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {user.displayName}
                {!disabled && (
                  <button
                    type="button"
                    className="ml-1 inline-flex text-blue-600 hover:text-blue-800"
                    onClick={() => handleRemove(user.id)}
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          onClick={() => !disabled && (teamSize === 'small' || searchTerm.length >= 2) && setIsOpen(true)}
        />
        
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {isOpen && !loading && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {results.map(user => (
            <div
              key={user.id}
              className="cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
              onClick={() => handleSelect(user)}
            >
              <div className="flex items-center">
                <div className="ml-3 flex-1">
                  <div className="font-medium text-gray-900">{user.displayName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isOpen && !loading && results.length === 0 && searchTerm && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 sm:text-sm">
          <div className="py-2 px-4 text-gray-700">No users found</div>
        </div>
      )}
      
      {error && (
        <div className="mt-1 text-sm text-red-600">{error}</div>
      )}
    </div>
  );
};

export default UserLookup;