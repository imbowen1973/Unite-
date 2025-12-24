// Policy and Procedure Management Types for Unite Platform

export interface PolicyDocument {
  id: string;
  docStableId: string;
  title: string;
  description: string;
  content: string; // The actual policy content
  version: string;
  status: 'draft' | 'proposed' | 'under_review' | 'approved' | 'published' | 'archived';
  category: string; // e.g., 'governance', 'operations', 'finance'
  effectiveDate?: string;
  revisionDate?: string;
  createdDate: string;
  updatedDate: string;
  author: string;
  approver?: string;
  versionHistory: PolicyVersion[];
  relatedDocuments: string[]; // docStableIds of related policies
}

export interface PolicyVersion {
  version: string;
  docStableId: string; // Points to the specific version document
  title: string;
  content: string;
  changeSummary: string;
  author: string;
  createdDate: string;
  isPublished: boolean;
  publishedPdfUrl?: string; // URL to the published PDF version
}

export interface PolicyChangeProposal {
  id: string;
  docStableId: string;
  policyId: string; // References the original policy
  title: string;
  description: string;
  proposedChanges: string; // Detailed description of proposed changes
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'scheduled' | 'adopted' | 'implemented';
  submitter: string; // User ID of the proposer
  submittedDate: string;
  executiveApproval?: {
    approved: boolean;
    approver: string;
    approvedDate: string;
    comments?: string;
  };
  boardMeetingId?: string; // Meeting where this will be discussed/voted on
  boardVote?: {
    passed: boolean;
    yes: number;
    no: number;
    abstain: number;
    voteDate: string;
    comments?: string;
  };
  implementationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyChangeAgendaItem {
  id: string;
  meetingId: string;
  proposalId: string;
  title: string;
  description: string;
  itemOrder: number;
  presenter?: string;
  timeAllocation: number; // in minutes
  status: 'pending' | 'in-progress' | 'discussed' | 'deferred' | 'completed';
  supportingDocuments: string[]; // docStableIds
  voteRequired: 'none' | 'approval' | 'opinion';
  voteType?: 'simple-majority' | 'super-majority' | 'unanimous';
  role: 'information' | 'action' | 'decision' | 'voting' | 'discussion'; // Role-based categorization
  discussionOutcome?: string;
  createdAt: string;
  updatedAt: string;
}
