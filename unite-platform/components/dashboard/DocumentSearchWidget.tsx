// Document Search Widget Component for Unite Platform
'use client';

import React, { useState } from 'react';

interface SearchResult {
  id: string;
  title: string;
  type: string;
  date: string;
  relevance: number;
}

const DocumentSearchWidget = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for search results
  const searchResults: SearchResult[] = [
    { id: 'doc-1', title: 'Data Governance Policy', type: 'policy', date: '2023-11-15', relevance: 95 },
    { id: 'doc-2', title: 'GDPR Compliance Guidelines', type: 'guideline', date: '2023-10-22', relevance: 87 },
    { id: 'doc-3', title: 'Meeting Minutes - Executive Board', type: 'minutes', date: '2023-12-05', relevance: 78 },
    { id: 'doc-4', title: 'Privacy Impact Assessment Template', type: 'template', date: '2023-09-30', relevance: 72 },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would call the document search API
    console.log('Searching for:', searchQuery);
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Document Search</h2>
      
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 py-2 sm:text-sm border-gray-300 rounded-md"
            placeholder="Search documents..."
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <label htmlFor="search-type" className="sr-only">Search type</label>
            <select
              id="search-type"
              className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option>All</option>
              <option>Policies</option>
              <option>Minutes</option>
              <option>Guidelines</option>
              <option>Templates</option>
            </select>
          </div>
        </div>
      </form>

      {searchQuery && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
          {searchResults.length > 0 ? (
            <ul className="space-y-3">
              {searchResults.map((result) => (
                <li key={result.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between">
                    <div className="font-medium text-sm hover:text-blue-600 cursor-pointer">{result.title}</div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {result.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <div className="text-xs text-gray-500">
                      {new Date(result.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.relevance}% match
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No documents found matching your search</p>
          )}
        </div>
      )}

      {!searchQuery && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Documents</h3>
          <ul className="space-y-2">
            <li className="p-2 bg-gray-50 rounded border border-gray-200">
              <div className="font-medium text-sm">Annual Compliance Report 2023</div>
              <div className="text-xs text-gray-500">Published: Dec 15, 2023</div>
            </li>
            <li className="p-2 bg-gray-50 rounded border border-gray-200">
              <div className="font-medium text-sm">Board Meeting Minutes - Nov 2023</div>
              <div className="text-xs text-gray-500">Published: Nov 30, 2023</div>
            </li>
            <li className="p-2 bg-gray-50 rounded border border-gray-200">
              <div className="font-medium text-sm">Data Processing Inventory</div>
              <div className="text-xs text-gray-500">Updated: Oct 15, 2023</div>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DocumentSearchWidget;
