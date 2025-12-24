'use client';

import React, { useState } from 'react';
import { PolicyChangeProposal } from '@/types/policy';

interface PolicyChangeProposalFormProps {
  onSubmit: (proposal: Omit<PolicyChangeProposal, 'id' | 'docStableId' | 'status' | 'submitter' | 'submittedDate' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  policyId: string;
  policyTitle: string;
}

const PolicyChangeProposalForm: React.FC<PolicyChangeProposalFormProps> = ({ 
  onSubmit, 
  onCancel, 
  policyId,
  policyTitle
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proposedChanges, setProposedChanges] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !proposedChanges.trim()) {
      alert('Title and Proposed Changes are required');
      return;
    }
    
    onSubmit({
      policyId,
      title,
      description,
      proposedChanges,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Policy Change Proposal</h2>
      <p className="text-gray-600 mb-4">For policy: <span className="font-medium">{policyTitle}</span></p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Proposal Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter a title for this proposal"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border rounded px-3 py-2"
            placeholder="Brief description of the proposal"
          />
        </div>
        
        <div>
          <label htmlFor="proposedChanges" className="block text-sm font-medium text-gray-700 mb-1">
            Proposed Changes *
          </label>
          <textarea
            id="proposedChanges"
            value={proposedChanges}
            onChange={(e) => setProposedChanges(e.target.value)}
            rows={6}
            className="w-full border rounded px-3 py-2"
            placeholder="Detailed description of the proposed changes to the policy"
          />
          <p className="mt-1 text-xs text-gray-500">Describe the specific changes you are proposing to the policy</p>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Submit Proposal
          </button>
        </div>
      </form>
    </div>
  );
};

export default PolicyChangeProposalForm;