// Pre-built Workflow Templates for Unite Platform

import { WorkflowTemplate } from './definitions'
import { AccessLevel, DocumentState } from '@/lib/access'

// ============================================================================
// STUDENT COMPLAINT WORKFLOW
// ============================================================================

export const studentComplaintWorkflow: WorkflowTemplate = {
  id: 'template-student-complaint',
  name: 'Student Complaint Resolution',
  description: 'Handles student complaints from submission through investigation to resolution',
  category: 'complaint',
  icon: '📝',
  useCases: [
    'Academic complaints',
    'Accommodation issues',
    'Discrimination or harassment complaints',
    'Service quality concerns',
  ],
  definition: {
    name: 'Student Complaint Resolution',
    description: 'Standard workflow for handling student complaints',
    version: '1.0',
    category: 'complaint',
    isActive: true,

    states: [
      {
        id: 'submitted',
        label: 'Submitted',
        description: 'Complaint has been submitted',
        color: 'blue',
        isInitial: true,
        allowedActions: ['view', 'comment'],
      },
      {
        id: 'under-review',
        label: 'Under Review',
        description: 'Complaint is being reviewed by assigned officer',
        color: 'yellow',
        allowedActions: ['view', 'comment', 'upload_evidence'],
        sla: {
          maxDuration: 120, // 5 days
          warningAt: 96, // 4 days
          escalateTo: 'Admin',
        },
      },
      {
        id: 'investigating',
        label: 'Investigation',
        description: 'Formal investigation in progress',
        color: 'orange',
        allowedActions: ['view', 'comment', 'upload_evidence'],
        sla: {
          maxDuration: 480, // 20 days
          warningAt: 384, // 16 days
        },
      },
      {
        id: 'committee-review',
        label: 'Committee Review',
        description: 'Under review by complaints committee',
        color: 'purple',
        allowedActions: ['view', 'comment'],
      },
      {
        id: 'resolved',
        label: 'Resolved',
        description: 'Complaint has been resolved',
        color: 'green',
        isFinal: true,
        allowedActions: ['view'],
      },
      {
        id: 'rejected',
        label: 'Rejected',
        description: 'Complaint was rejected',
        color: 'red',
        isFinal: true,
        allowedActions: ['view'],
      },
    ],

    transitions: [
      {
        id: 'assign-for-review',
        label: 'Assign for Review',
        from: 'submitted',
        to: 'under-review',
        requiredRoles: ['Admin', 'ComplaintsOfficer'],
        requiresComment: false,
        actions: [
          {
            type: 'notify',
            notifyRoles: ['ComplaintsOfficer'],
            notificationMessage: 'New complaint assigned to you for review',
          },
        ],
      },
      {
        id: 'start-investigation',
        label: 'Start Investigation',
        from: 'under-review',
        to: 'investigating',
        requiredRoles: ['ComplaintsOfficer'],
        requiresComment: true,
        actions: [
          {
            type: 'audit',
            auditMessage: 'Formal investigation started',
            auditSeverity: 'info',
          },
        ],
      },
      {
        id: 'resolve-directly',
        label: 'Resolve Without Investigation',
        from: 'under-review',
        to: 'resolved',
        requiredRoles: ['ComplaintsOfficer'],
        requiresComment: true,
        confirmationMessage: 'Are you sure you want to resolve this complaint without investigation?',
      },
      {
        id: 'reject-complaint',
        label: 'Reject Complaint',
        from: 'under-review',
        to: 'rejected',
        requiredRoles: ['ComplaintsOfficer'],
        requiresComment: true,
        confirmationMessage: 'Are you sure you want to reject this complaint?',
      },
      {
        id: 'escalate-to-committee',
        label: 'Escalate to Committee',
        from: 'investigating',
        to: 'committee-review',
        requiredRoles: ['ComplaintsOfficer'],
        requiresComment: true,
        actions: [
          {
            type: 'notify',
            notifyCommittees: ['ComplaintsCommittee'],
            notificationMessage: 'New complaint escalated for committee review',
          },
        ],
      },
      {
        id: 'resolve-after-investigation',
        label: 'Resolve',
        from: 'investigating',
        to: 'resolved',
        requiredRoles: ['ComplaintsOfficer'],
        requiresComment: true,
        requiresAttachments: true,
        minAttachments: 1,
      },
      {
        id: 'committee-approve',
        label: 'Approve Resolution',
        from: 'committee-review',
        to: 'resolved',
        requiredRoles: ['Board'],
        requiresVote: true,
        voteType: 'simple-majority',
        requiresComment: true,
      },
      {
        id: 'committee-reject',
        label: 'Reject Complaint',
        from: 'committee-review',
        to: 'rejected',
        requiredRoles: ['Board'],
        requiresVote: true,
        voteType: 'simple-majority',
        requiresComment: true,
      },
    ],

    assignmentRules: [
      {
        id: 'rule-student-complaint',
        priority: 10,
        documentType: ['complaint'],
        documentCategory: ['student'],
        tags: ['student-complaint', 'complaint'],
      },
    ],

    fields: [
      {
        name: 'complainantName',
        label: 'Complainant Name',
        type: 'text',
        required: true,
        description: 'Name of the student making the complaint',
      },
      {
        name: 'complainantEmail',
        label: 'Complainant Email',
        type: 'text',
        required: true,
        validation: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        },
      },
      {
        name: 'complaintCategory',
        label: 'Complaint Category',
        type: 'select',
        required: true,
        validation: {
          options: [
            'Academic',
            'Accommodation',
            'Discrimination',
            'Harassment',
            'Service Quality',
            'Other',
          ],
        },
      },
      {
        name: 'description',
        label: 'Complaint Description',
        type: 'text',
        required: true,
        description: 'Detailed description of the complaint',
      },
      {
        name: 'dateOfIncident',
        label: 'Date of Incident',
        type: 'date',
        required: true,
      },
      {
        name: 'assignedOfficer',
        label: 'Assigned Complaints Officer',
        type: 'user',
        required: false,
        editableInStates: ['submitted'],
      },
      {
        name: 'evidenceDocuments',
        label: 'Evidence Documents',
        type: 'document',
        required: false,
        editableInStates: ['under-review', 'investigating'],
      },
      {
        name: 'resolution',
        label: 'Resolution Outcome',
        type: 'text',
        required: false,
        requiredInStates: ['resolved'],
      },
    ],

    automations: [
      {
        id: 'auto-sla-warning',
        name: 'SLA Warning Notification',
        trigger: 'timeElapsed',
        timeElapsed: 96, // 4 days
        triggerState: 'under-review',
        actions: [
          {
            type: 'notify',
            notifyRoles: ['Admin'],
            notificationTemplate: 'Complaint approaching SLA deadline',
          },
        ],
      },
    ],

    settings: {
      allowedAccessLevels: [AccessLevel.Admin, AccessLevel.Executive],
      allowedRoles: ['Admin', 'ComplaintsOfficer', 'Board'],
      allowedCommittees: ['ComplaintsCommittee'],
      requireDocument: true,
      allowMultipleDocuments: true,
      allowedFileTypes: ['pdf', 'docx', 'jpg', 'png'],
      maxFileSize: 10,
      enableVersionHistory: true,
      autoVersionOnStateChange: true,
      enableEmailNotifications: true,
      enableTeamsNotifications: false,
      auditAllActions: true,
      retentionPeriod: 2555, // 7 years
      dmsLibrary: 'Complaints',
      siteCollection: 'unite-complaints',
    },
  },
}

// ============================================================================
// DOCUMENT APPROVAL WORKFLOW
// ============================================================================

export const documentApprovalWorkflow: WorkflowTemplate = {
  id: 'template-document-approval',
  name: 'Document Approval',
  description: 'Simple approval workflow for documents requiring committee or board approval',
  category: 'approval',
  icon: '✓',
  useCases: [
    'Board papers requiring approval',
    'Committee reports',
    'Financial documents',
    'Contract approvals',
  ],
  definition: {
    name: 'Document Approval',
    description: 'Standard approval workflow for documents',
    version: '1.0',
    category: 'approval',
    isActive: true,

    states: [
      {
        id: 'draft',
        label: 'Draft',
        description: 'Document is in draft status',
        color: 'gray',
        isInitial: true,
        allowedActions: ['edit', 'comment'],
      },
      {
        id: 'pending-review',
        label: 'Pending Review',
        description: 'Document submitted for review',
        color: 'blue',
        allowedActions: ['view', 'comment'],
      },
      {
        id: 'approved',
        label: 'Approved',
        description: 'Document has been approved',
        color: 'green',
        isFinal: true,
        allowedActions: ['view'],
        onEnter: [
          {
            type: 'document',
            moveDocumentTo: '/Approved',
            documentStateChange: DocumentState.Approved,
          },
        ],
      },
      {
        id: 'rejected',
        label: 'Rejected',
        description: 'Document was rejected',
        color: 'red',
        isFinal: true,
        allowedActions: ['view'],
      },
    ],

    transitions: [
      {
        id: 'submit-for-review',
        label: 'Submit for Review',
        from: 'draft',
        to: 'pending-review',
        requiresComment: false,
        actions: [
          {
            type: 'notify',
            notifyRoles: ['Approver'],
            notificationMessage: 'New document submitted for your review',
          },
        ],
      },
      {
        id: 'approve',
        label: 'Approve',
        from: 'pending-review',
        to: 'approved',
        requiredRoles: ['Board', 'Executive'],
        requiresComment: false,
      },
      {
        id: 'reject',
        label: 'Reject',
        from: 'pending-review',
        to: 'rejected',
        requiredRoles: ['Board', 'Executive'],
        requiresComment: true,
      },
    ],

    assignmentRules: [
      {
        id: 'rule-general-approval',
        priority: 5,
        documentType: ['report', 'proposal', 'contract'],
      },
    ],

    fields: [
      {
        name: 'title',
        label: 'Document Title',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'text',
        required: false,
      },
      {
        name: 'approver',
        label: 'Assigned Approver',
        type: 'user',
        required: true,
      },
    ],

    settings: {
      allowedAccessLevels: [AccessLevel.Admin, AccessLevel.Executive, AccessLevel.Board],
      requireDocument: true,
      allowMultipleDocuments: false,
      enableVersionHistory: true,
      autoVersionOnStateChange: true,
      enableEmailNotifications: true,
      enableTeamsNotifications: true,
      auditAllActions: true,
      retentionPeriod: 1825, // 5 years
      dmsLibrary: 'Documents',
      siteCollection: 'unite-docs',
    },
  },
}

// ============================================================================
// RESEARCH ETHICS APPROVAL
// ============================================================================

export const researchEthicsWorkflow: WorkflowTemplate = {
  id: 'template-research-ethics',
  name: 'Research Ethics Approval',
  description: 'Workflow for research ethics applications requiring committee approval',
  category: 'ethics',
  icon: '🔬',
  useCases: [
    'Human subjects research',
    'Animal research protocols',
    'Data collection requiring ethics approval',
  ],
  definition: {
    name: 'Research Ethics Approval',
    description: 'Research ethics application review process',
    version: '1.0',
    category: 'ethics',
    isActive: true,

    states: [
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'blue',
        isInitial: true,
        allowedActions: ['view'],
      },
      {
        id: 'initial-review',
        label: 'Initial Review',
        color: 'yellow',
        allowedActions: ['view', 'comment'],
        sla: {
          maxDuration: 168, // 7 days
          warningAt: 120,
        },
      },
      {
        id: 'revisions-requested',
        label: 'Revisions Requested',
        color: 'orange',
        allowedActions: ['edit', 'upload_evidence'],
      },
      {
        id: 'committee-review',
        label: 'Committee Review',
        color: 'purple',
        allowedActions: ['view', 'comment'],
      },
      {
        id: 'approved',
        label: 'Approved',
        color: 'green',
        isFinal: true,
        allowedActions: ['view'],
      },
      {
        id: 'rejected',
        label: 'Rejected',
        color: 'red',
        isFinal: true,
        allowedActions: ['view'],
      },
    ],

    transitions: [
      {
        id: 'start-review',
        label: 'Start Initial Review',
        from: 'submitted',
        to: 'initial-review',
        requiredRoles: ['EthicsOfficer'],
      },
      {
        id: 'request-revisions',
        label: 'Request Revisions',
        from: 'initial-review',
        to: 'revisions-requested',
        requiredRoles: ['EthicsOfficer'],
        requiresComment: true,
      },
      {
        id: 'send-to-committee',
        label: 'Send to Committee',
        from: 'initial-review',
        to: 'committee-review',
        requiredRoles: ['EthicsOfficer'],
      },
      {
        id: 'resubmit',
        label: 'Resubmit',
        from: 'revisions-requested',
        to: 'initial-review',
        requiresComment: true,
      },
      {
        id: 'committee-approve',
        label: 'Approve',
        from: 'committee-review',
        to: 'approved',
        requiredRoles: ['Board'],
        requiresVote: true,
        voteType: 'simple-majority',
      },
      {
        id: 'committee-reject',
        label: 'Reject',
        from: 'committee-review',
        to: 'rejected',
        requiredRoles: ['Board'],
        requiresVote: true,
        voteType: 'simple-majority',
        requiresComment: true,
      },
    ],

    assignmentRules: [
      {
        id: 'rule-ethics',
        priority: 15,
        documentType: ['ethics-application'],
        committee: ['EthicsCommittee'],
      },
    ],

    fields: [
      {
        name: 'researcherName',
        label: 'Researcher Name',
        type: 'text',
        required: true,
      },
      {
        name: 'researchTitle',
        label: 'Research Title',
        type: 'text',
        required: true,
      },
      {
        name: 'researchType',
        label: 'Research Type',
        type: 'select',
        required: true,
        validation: {
          options: ['Human Subjects', 'Animal Research', 'Data Collection', 'Clinical Trial'],
        },
      },
      {
        name: 'riskLevel',
        label: 'Risk Level',
        type: 'select',
        required: true,
        validation: {
          options: ['Minimal', 'Low', 'Medium', 'High'],
        },
      },
      {
        name: 'participantCount',
        label: 'Expected Participant Count',
        type: 'number',
        required: true,
        validation: {
          min: 1,
        },
      },
    ],

    settings: {
      allowedAccessLevels: [AccessLevel.Admin, AccessLevel.Executive],
      allowedCommittees: ['EthicsCommittee'],
      requireDocument: true,
      allowMultipleDocuments: true,
      allowedFileTypes: ['pdf', 'docx'],
      enableVersionHistory: true,
      autoVersionOnStateChange: true,
      enableEmailNotifications: true,
      auditAllActions: true,
      retentionPeriod: 3650, // 10 years
      dmsLibrary: 'Ethics',
      siteCollection: 'unite-ethics',
    },
  },
}

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const workflowTemplates: WorkflowTemplate[] = [
  studentComplaintWorkflow,
  documentApprovalWorkflow,
  researchEthicsWorkflow,
]

export function getTemplateById(templateId: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === templateId)
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.category === category)
}
