'use client';

import React, { useState } from 'react';
import PolicyTimeMachine from '@/components/policy/PolicyTimeMachine';
import PolicyChangeProposalForm from '@/components/policy/PolicyChangeProposalForm';
import { PolicyChangeProposal } from '@/types/policy';

const PolicyManagementPage = () => {
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'proposals'>('overview');
  const [proposals, setProposals] = useState<PolicyChangeProposal[]>([
    {
      id: 'prop-1',
      docStableId: 'PROP-12345-ABCDE',
      policyId: 'policy-1',
      title: 'Remote Work Policy Update',
      description: 'Update remote work policy to reflect new hybrid work model',
      proposedChanges: 'The remote work policy will be updated to allow employees to work from home up to 3 days per week, with manager approval. The policy will also include provisions for home office stipends.',
      status: 'adopted',
      submitter: 'manager@unite-platform.com',
      submittedDate: '2023-05-15T10:30:00Z',
      executiveApproval: {
        approved: true,
        approver: 'executive@unite-platform.com',
        approvedDate: '2023-05-20T14:00:00Z',
        comments: 'Approved with minor revisions'
      },
      boardMeetingId: 'meeting-456',
      boardVote: {
        passed: true,
        yes: 8,
        no: 1,
        abstain: 1,
        voteDate: '2023-06-05T16:00:00Z',
        comments: 'Motion carried with majority vote'
      },
      implementationDate: '2023-06-10T09:00:00Z',
      createdAt: '2023-05-15T10:30:00Z',
      updatedAt: '2023-06-10T09:00:00Z'
    },
    {
      id: 'prop-2',
      docStableId: 'PROP-12346-BCDEF',
      policyId: 'policy-1',
      title: 'Code of Conduct Revision',
      description: 'Revise code of conduct to include new ethical guidelines',
      proposedChanges: 'The code of conduct will be updated to include specific guidelines for AI use, data privacy, and ethical decision-making. New reporting mechanisms for violations will also be added.',
      status: 'approved',
      submitter: 'hr@unite-platform.com',
      submittedDate: '2023-07-10T11:15:00Z',
      executiveApproval: {
        approved: true,
        approver: 'executive@unite-platform.com',
        approvedDate: '2023-07-15T13:45:00Z',
        comments: 'Approved for board review'
      },
      boardMeetingId: 'meeting-567',
      createdAt: '2023-07-10T11:15:00Z',
      updatedAt: '2023-07-15T13:45:00Z'
    },
    {
      id: 'prop-3',
      docStableId: 'PROP-12347-CDEFG',
      policyId: 'policy-2',
      title: 'Data Security Enhancement',
      description: 'Enhance data security policy with new protocols',
      proposedChanges: 'New data security protocols will be implemented, including mandatory encryption for all sensitive data transfers and additional authentication requirements for accessing critical systems.',
      status: 'submitted',
      submitter: 'security@unite-platform.com',
      submittedDate: '2023-08-01T09:20:00Z',
      createdAt: '2023-08-01T09:20:00Z',
      updatedAt: '2023-08-01T09:20:00Z'
    }
  ]);

  const handleNewProposal = (proposalData: Omit<PolicyChangeProposal, 'id' | 'docStableId' | 'status' | 'submitter' | 'submittedDate' | 'createdAt' | 'updatedAt'>) => {
    const newProposal: PolicyChangeProposal = {
      ...proposalData,
      id: `prop-${Date.now()}`,
      docStableId: `PROP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'submitted',
      submitter: 'current-user@unite-platform.com', // In real app, this would come from auth context
      submittedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setProposals([newProposal, ...proposals]);
    setShowProposalForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Policy Management System</h1>
              <button
                onClick={() => setShowProposalForm(true)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                New Policy Change Proposal
              </button>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Policy Overview
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Version History (Time Machine)
                </button>
                <button
                  onClick={() => setActiveTab('proposals')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'proposals'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Change Proposals
                </button>
              </nav>
            </div>
            
            {showProposalForm && (
              <div className="mb-8">
                <PolicyChangeProposalForm
                  onSubmit={handleNewProposal}
                  onCancel={() => setShowProposalForm(false)}
                  policyId="policy-1"
                  policyTitle="Employee Handbook"
                />
              </div>
            )}
            
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Current Policies</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4 shadow-sm">
                        <h3 className="font-medium text-gray-900">Employee Handbook</h3>
                        <p className="text-sm text-gray-500">Version 2.1 • Last updated: 2023-06-10</p>
                        <div className="mt-2 flex space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Published
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            HR Policy
                          </span>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4 shadow-sm">
                        <h3 className="font-medium text-gray-900">Data Security Policy</h3>
                        <p className="text-sm text-gray-500">Version 1.5 • Last updated: 2023-05-20</p>
                        <div className="mt-2 flex space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Published
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Security Policy
                          </span>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4 shadow-sm">
                        <h3 className="font-medium text-gray-900">Code of Conduct</h3>
                        <p className="text-sm text-gray-500">Version 3.0 • Last updated: 2023-07-01</p>
                        <div className="mt-2 flex space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Under Review
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            HR Policy
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Policy Change Workflow</h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center">
                      <div className="p-3 bg-gray-100 rounded">
                        <div className="font-medium text-sm">Proposal</div>
                        <div className="text-xs text-gray-500">Submit change request</div>
                      </div>
                      <div className="p-3 bg-blue-100 rounded">
                        <div className="font-medium text-sm">Executive Review</div>
                        <div className="text-xs text-gray-500">Leadership approval</div>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded">
                        <div className="font-medium text-sm">Board Meeting</div>
                        <div className="text-xs text-gray-500">Schedule for vote</div>
                      </div>
                      <div className="p-3 bg-green-100 rounded">
                        <div className="font-medium text-sm">Vote</div>
                        <div className="text-xs text-gray-500">Board decision</div>
                      </div>
                      <div className="p-3 bg-purple-100 rounded">
                        <div className="font-medium text-sm">Publish</div>
                        <div className="text-xs text-gray-500">PDF distribution</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'history' && (
              <div>
                <PolicyTimeMachine policyId="policy-1" />
              </div>
            )}
            
            {activeTab === 'proposals' && (
              <div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Policy Change Proposals</h2>
                    <div className="space-y-4">
                      {proposals.map((proposal) => (
                        <div key={proposal.id} className="border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{proposal.title}</h3>
                              <p className="text-sm text-gray-500">{proposal.description}</p>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                proposal.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                proposal.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                proposal.status === 'adopted' ? 'bg-green-100 text-green-800' :
                                proposal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Submitted: {new Date(proposal.submittedDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex flex-wrap gap-2">
                            {proposal.executiveApproval && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Executive Approved
                              </span>
                            )}
                            {proposal.boardVote && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                proposal.boardVote.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {proposal.boardVote.passed ? 'Voted YES' : 'Voted NO'}
                              </span>
                            )}
                            {proposal.implementationDate && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Implemented
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyManagementPage;