'use client';

import React, { useState, useEffect } from 'react';
import { PolicyVersion } from '@/types/policy';

interface PolicyTimeMachineProps {
  policyId: string;
  onVersionSelect?: (version: PolicyVersion) => void;
}

const PolicyTimeMachine: React.FC<PolicyTimeMachineProps> = ({ policyId, onVersionSelect }) => {
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PolicyVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In a real implementation, this would fetch from the policy service
  useEffect(() => {
    // Mock data for demonstration
    const mockVersions: PolicyVersion[] = [
      {
        version: '1.0',
        docStableId: 'POL-12345-ABCDE',
        title: 'Initial Policy',
        content: 'This is the initial version of the policy document.',
        changeSummary: 'Initial policy creation',
        author: 'admin@unite-platform.com',
        createdDate: '2023-01-15T10:00:00Z',
        isPublished: false
      },
      {
        version: '1.1',
        docStableId: 'POL-12346-BCDEF',
        title: 'Updated Policy',
        content: 'This is the updated version of the policy document with additional clauses.',
        changeSummary: 'Added compliance requirements section',
        author: 'executive@unite-platform.com',
        createdDate: '2023-03-22T14:30:00Z',
        isPublished: true,
        publishedPdfUrl: 'https://example.com/policies/policy-v1.1.pdf'
      },
      {
        version: '2.0',
        docStableId: 'POL-12347-CDEFG',
        title: 'Major Revision',
        content: 'This is the major revision of the policy document with significant changes.',
        changeSummary: 'Complete overhaul of policy framework',
        author: 'executive@unite-platform.com',
        createdDate: '2023-06-10T09:15:00Z',
        isPublished: true,
        publishedPdfUrl: 'https://example.com/policies/policy-v2.0.pdf'
      }
    ];
    
    setVersions(mockVersions);
    if (mockVersions.length > 0) {
      setSelectedVersion(mockVersions[mockVersions.length - 1]); // Select latest version
    }
    setIsLoading(false);
  }, [policyId]);

  const handleVersionSelect = (version: PolicyVersion) => {
    setSelectedVersion(version);
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Policy Time Machine</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Version History</h3>
        <div className="space-y-3">
          {versions.map((version, index) => (
            <div 
              key={version.docStableId}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedVersion?.docStableId === version.docStableId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleVersionSelect(version)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">Version {version.version}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(version.createdDate).toLocaleDateString()} by {version.author}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {version.isPublished && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Published
                    </span>
                  )}
                  <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {version.changeSummary}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedVersion && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            Version {selectedVersion.version} Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Version</label>
              <div className="mt-1 text-gray-900">{selectedVersion.version}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <div className="mt-1 text-gray-900">
                {new Date(selectedVersion.createdDate).toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Author</label>
              <div className="mt-1 text-gray-900">{selectedVersion.author}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Published</label>
              <div className="mt-1">
                {selectedVersion.isPublished ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    No
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Summary</label>
            <div className="p-3 bg-gray-50 rounded text-gray-800">{selectedVersion.changeSummary}</div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Preview</label>
            <div className="p-3 bg-gray-50 rounded text-gray-800 max-h-40 overflow-y-auto">
              {selectedVersion.content.substring(0, 200)}...
            </div>
          </div>

          {selectedVersion.publishedPdfUrl && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Published Document</label>
              <a 
                href={selectedVersion.publishedPdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Download PDF Version
              </a>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => {
                // In a real implementation, this would restore the selected version
                alert(`Restoring version ${selectedVersion.version} would go here`);
              }}
            >
              Restore This Version
            </button>
            <button
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // In a real implementation, this would show the full content
                alert(`Showing full content for version ${selectedVersion.version} would go here`);
              }}
            >
              View Full Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyTimeMachine;