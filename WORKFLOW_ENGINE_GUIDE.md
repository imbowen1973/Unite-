# Workflow Engine Guide

## Overview

The Unite Platform Workflow Engine allows you to create **configurable workflows without writing code**. This means non-developers can create new business processes, approval flows, and document workflows by defining them as JSON configurations.

## Key Concepts

### What is a Workflow?

A workflow is a **state machine** that defines:
- **States**: The stages a document or request goes through (e.g., Draft → Review → Approved)
- **Transitions**: The allowed movements between states (e.g., "Submit for Approval")
- **Rules**: Who can perform transitions and under what conditions
- **Actions**: What happens automatically (notifications, document movements, etc.)

### Workflow vs Hardcoded Services

| Feature | Workflow Engine | Hardcoded Services (Policy, College QA) |
|---------|----------------|----------------------------------------|
| **Creation** | JSON configuration | TypeScript code |
| **Deployment** | No code deployment needed | Requires code deployment |
| **Complexity** | Good for simple-medium workflows | Best for complex business logic |
| **Customization** | Limited to engine capabilities | Fully customizable |
| **Examples** | Complaint handling, document approval | Policy versioning, college QA reviews |

**Use the workflow engine when**: You have repetitive patterns (e.g., 5 different complaint types all following similar steps)

**Use hardcoded services when**: You have unique business logic (e.g., policy superseding, interactive evidence requests)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Engine System                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   Workflow       │         │   Workflow       │          │
│  │   Definitions    │────────▶│   Engine         │          │
│  │   (JSON Config)  │         │   Service        │          │
│  └──────────────────┘         └──────────────────┘          │
│           │                            │                     │
│           │                            ▼                     │
│           │                   ┌──────────────────┐          │
│           │                   │   Workflow       │          │
│           └──────────────────▶│   Router         │          │
│                               │   (Auto-assign)  │          │
│                               └──────────────────┘          │
│                                        │                     │
│                                        ▼                     │
│                               ┌──────────────────┐          │
│                               │   Workflow       │          │
│                               │   Instances      │          │
│                               │   (Running)      │          │
│                               └──────────────────┘          │
│                                        │                     │
│                                        ▼                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Integration Layer                             │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  DMS  │  Audit  │  Access Control  │  SharePoint    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Creating a Workflow

### Step 1: Define States

States represent the stages in your workflow.

```json
{
  "states": [
    {
      "id": "submitted",
      "label": "Submitted",
      "description": "Request has been submitted",
      "color": "blue",
      "isInitial": true,
      "allowedActions": ["view", "comment"]
    },
    {
      "id": "approved",
      "label": "Approved",
      "color": "green",
      "isFinal": true,
      "allowedActions": ["view"]
    }
  ]
}
```

**Key Properties**:
- `isInitial: true` - Workflow starts here
- `isFinal: true` - Workflow ends here
- `sla` - Optional time limits with warnings/escalation

### Step 2: Define Transitions

Transitions are the actions that move between states.

```json
{
  "transitions": [
    {
      "id": "approve",
      "label": "Approve Request",
      "from": "submitted",
      "to": "approved",
      "requiredRoles": ["Admin", "Board"],
      "requiresComment": true,
      "requiresVote": false
    }
  ]
}
```

**Permission Controls**:
- `requiredRoles` - User must have one of these roles
- `requiredAccessLevel` - Minimum access level required
- `requiredCommittees` - User must be in one of these committees

**Additional Requirements**:
- `requiresComment` - Force user to explain their action
- `requiresVote` - Transition requires voting (see Voting section)
- `requiresAttachments` - Must upload documents

### Step 3: Define Assignment Rules

Rules determine **when this workflow automatically applies**.

```json
{
  "assignmentRules": [
    {
      "id": "rule-student-complaint",
      "priority": 10,
      "documentType": ["complaint"],
      "documentCategory": ["student"],
      "committee": ["StudentWelfare"],
      "tags": ["urgent"]
    }
  ]
}
```

**Matching Logic**: ALL criteria in a rule must match.

**Example**: This workflow applies to documents that are:
- Type: "complaint" AND
- Category: "student" AND
- Assigned to: "StudentWelfare" committee AND
- Tagged: "urgent"

**Priority**: Higher priority rules match first (useful when multiple workflows could apply).

### Step 4: Define Custom Fields

Fields capture workflow-specific data.

```json
{
  "fields": [
    {
      "name": "complainantName",
      "label": "Complainant Name",
      "type": "text",
      "required": true,
      "validation": {
        "pattern": "^[A-Za-z\\s]+$"
      }
    },
    {
      "name": "severity",
      "label": "Issue Severity",
      "type": "select",
      "required": true,
      "validation": {
        "options": ["Low", "Medium", "High", "Critical"]
      },
      "editableInStates": ["submitted", "under-review"]
    }
  ]
}
```

**Field Types**:
- `text` - String input
- `number` - Numeric input
- `date` - Date picker
- `boolean` - Checkbox
- `select` / `multiselect` - Dropdown
- `document` - File reference
- `user` - User picker

**State-Based Visibility**:
- `visibleInStates` - Only show in certain states
- `editableInStates` - Only editable in certain states
- `requiredInStates` - Required in specific states

### Step 5: Define Actions & Automations

Actions happen automatically when states change.

```json
{
  "states": [
    {
      "id": "approved",
      "onEnter": [
        {
          "type": "notify",
          "notifyUsers": ["submitter@university.ac.uk"],
          "notificationTemplate": "Your request has been approved"
        },
        {
          "type": "document",
          "moveDocumentTo": "/Approved",
          "documentStateChange": "Approved"
        },
        {
          "type": "createTask",
          "taskTitle": "Process approved request",
          "taskAssignee": "admin@university.ac.uk",
          "taskDueInDays": 5
        }
      ]
    }
  ]
}
```

**Action Types**:
- `notify` - Send email/Teams notification
- `assign` - Assign workflow to user/committee
- `updateField` - Set field values automatically
- `document` - Move/update document in DMS
- `createTask` - Create Microsoft Planner task
- `webhook` - Call external API

---

## Assignment Rules in Detail

### Assigning to Documents

When a document is created or updated, the workflow router checks all active workflows to find matches.

```typescript
// Document created with these properties:
{
  docStableId: "DOC-12345",
  documentType: "complaint",
  category: "student",
  committee: "StudentWelfare",
  tags: ["academic", "urgent"]
}

// Workflow engine automatically:
// 1. Finds workflows with matching assignment rules
// 2. Scores each workflow by priority
// 3. Starts the highest-scoring workflow
```

### Assigning to Teams/Committees

Workflows can be assigned to specific committees or teams.

```json
{
  "assignmentRules": [
    {
      "id": "rule-academic-committee",
      "priority": 10,
      "committee": ["AcademicStandards", "AcademicQuality"],
      "documentType": ["review", "audit"]
    }
  ]
}
```

When a document is routed to the "AcademicStandards" committee, this workflow starts automatically.

### Custom Field Matching

For advanced routing based on field values:

```json
{
  "assignmentRules": [
    {
      "id": "rule-high-value-contracts",
      "priority": 20,
      "documentType": ["contract"],
      "customFieldMatches": [
        {
          "fieldName": "contractValue",
          "operator": "greaterThan",
          "value": 50000
        },
        {
          "fieldName": "region",
          "operator": "equals",
          "value": "International"
        }
      ]
    }
  ]
}
```

This workflow only applies to contracts over £50,000 in the International region.

---

## API Usage

### 1. Create a Workflow Definition

```bash
POST /api/workflow-engine
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "createDefinition",
  "definition": {
    "name": "Student Complaint Resolution",
    "description": "Handles student complaints",
    "version": "1.0",
    "category": "complaint",
    "isActive": true,
    "states": [...],
    "transitions": [...],
    "assignmentRules": [...],
    "fields": [...],
    "settings": {
      "allowedAccessLevels": ["Admin", "Executive"],
      "requireDocument": true,
      "enableEmailNotifications": true,
      "auditAllActions": true,
      "dmsLibrary": "Complaints",
      "siteCollection": "unite-complaints"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "workflow": {
    "id": "wf-abc123",
    "name": "Student Complaint Resolution",
    "createdAt": "2025-01-15T10:00:00Z",
    ...
  }
}
```

### 2. Start a Workflow Instance

**Manual Start**:
```bash
POST /api/workflow-engine
{
  "action": "startWorkflow",
  "workflowDefinitionId": "wf-abc123",
  "fieldValues": {
    "complainantName": "Jane Smith",
    "complainantEmail": "jane@university.ac.uk",
    "complaintCategory": "Academic",
    "description": "Grading dispute for module XYZ"
  },
  "docStableId": "DOC-12345",
  "assignedCommittee": "StudentWelfare"
}
```

**Automatic Start** (via routing):
```bash
POST /api/workflow-engine
{
  "action": "routeDocument",
  "docStableId": "DOC-12345",
  "documentType": "complaint",
  "category": "student",
  "committee": "StudentWelfare",
  "tags": ["academic"]
}
```

The workflow router will automatically find and start the matching workflow.

### 3. Execute a Transition

```bash
POST /api/workflow-engine
{
  "action": "executeTransition",
  "instanceId": "inst-xyz789",
  "transitionId": "approve",
  "comment": "Complaint is valid, starting investigation",
  "attachments": ["DOC-evidence-001"]
}
```

### 4. Update Field Values

```bash
POST /api/workflow-engine
{
  "action": "updateFields",
  "instanceId": "inst-xyz789",
  "fieldUpdates": {
    "assignedOfficer": "john.doe@university.ac.uk",
    "severity": "High"
  }
}
```

### 5. Vote on a Transition

For transitions that require voting:

```bash
POST /api/workflow-engine
{
  "action": "castVote",
  "instanceId": "inst-xyz789",
  "transitionId": "committee-approve",
  "vote": "for",
  "comment": "Evidence supports the complaint"
}
```

Votes can be:
- `"for"` - Approve the transition
- `"against"` - Reject the transition
- `"abstain"` - Abstain from voting

**Vote Types**:
- `simple-majority` - More "for" than "against"
- `two-thirds` - At least 2/3 of votes are "for"
- `unanimous` - All votes are "for", no "against"

### 6. Get Workflow Instance

```bash
GET /api/workflow-engine?instanceId=inst-xyz789
```

**Response**:
```json
{
  "success": true,
  "instance": {
    "id": "inst-xyz789",
    "workflowDefinitionId": "wf-abc123",
    "currentState": "under-review",
    "stateEnteredAt": "2025-01-15T11:00:00Z",
    "fieldValues": {
      "complainantName": "Jane Smith",
      "severity": "High"
    },
    "history": [
      {
        "timestamp": "2025-01-15T10:00:00Z",
        "actor": "jane@university.ac.uk",
        "action": "transition",
        "toState": "submitted"
      },
      {
        "timestamp": "2025-01-15T11:00:00Z",
        "actor": "admin@university.ac.uk",
        "action": "transition",
        "fromState": "submitted",
        "toState": "under-review",
        "comment": "Assigned for review"
      }
    ]
  }
}
```

### 7. Get Available Transitions

```bash
POST /api/workflow-engine
{
  "action": "getAvailableTransitions",
  "instanceId": "inst-xyz789"
}
```

**Response**:
```json
{
  "success": true,
  "transitions": [
    {
      "id": "start-investigation",
      "label": "Start Investigation",
      "from": "under-review",
      "to": "investigating",
      "requiredRoles": ["ComplaintsOfficer"],
      "requiresComment": true
    },
    {
      "id": "resolve-directly",
      "label": "Resolve Without Investigation",
      "from": "under-review",
      "to": "resolved",
      "confirmationMessage": "Are you sure?"
    }
  ]
}
```

---

## Pre-built Templates

The workflow engine includes three ready-to-use templates:

### 1. Student Complaint Resolution

**States**: Submitted → Under Review → Investigation → Committee Review → Resolved/Rejected

**Features**:
- SLA tracking (5-day review deadline)
- Evidence document uploads
- Committee voting for escalated cases
- Automatic notifications

**Use Cases**:
- Academic complaints
- Accommodation issues
- Discrimination/harassment complaints

### 2. Document Approval

**States**: Draft → Pending Review → Approved/Rejected

**Features**:
- Simple approval workflow
- Document movement to "Approved" folder on approval
- Email notifications

**Use Cases**:
- Board papers
- Committee reports
- Contract approvals

### 3. Research Ethics Approval

**States**: Submitted → Initial Review → Revisions Requested → Committee Review → Approved/Rejected

**Features**:
- Revision cycle support
- Committee voting
- SLA tracking (7-day initial review)

**Use Cases**:
- Human subjects research
- Animal research protocols
- Data collection ethics

### Using Templates

```typescript
import { workflowTemplates, getTemplateById } from '@/lib/workflow-engine/templates'

// Get template
const template = getTemplateById('template-student-complaint')

// Create workflow from template
const response = await fetch('/api/workflow-engine', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'createDefinition',
    definition: {
      ...template.definition,
      // Customize as needed
      name: 'My Custom Complaint Workflow'
    }
  })
})
```

---

## Integration with Existing Workflows

The workflow engine integrates seamlessly with Unite's existing hardcoded workflows:

### Policy Management

Policies use the **hardcoded PolicyManagementService** because:
- Complex versioning logic
- Automatic superseding of old versions
- Two-stage approval (Executive → Board)
- Compliance framework mapping

### College QA

College QA uses the **hardcoded CollegeQAService** because:
- Interactive evidence request/response
- Remediation tracking
- Best practice extraction
- Multi-party interaction (college ↔ committee → board)

### Meeting & Voting

Meetings use the **hardcoded MeetingManagementService** because:
- Complex agenda item management
- AI-powered meeting summaries
- Planner integration for action items

### Document Workflow

The **DocumentWorkflowService** provides base functionality that both the workflow engine and hardcoded services use:
- Document state management (Draft → Approved → Published)
- DMS integration
- Audit logging

---

## Best Practices

### 1. Start with Templates

Use pre-built templates as starting points rather than building from scratch.

### 2. Keep Workflows Simple

If you need more than 7 states or complex conditional logic, consider a hardcoded service instead.

### 3. Use Assignment Rules Strategically

**Good**:
```json
{
  "assignmentRules": [
    {
      "documentType": ["complaint"],
      "committee": ["StudentWelfare"],
      "priority": 10
    }
  ]
}
```

**Too Broad** (will match everything):
```json
{
  "assignmentRules": [
    {
      "priority": 1
    }
  ]
}
```

### 4. Add SLA Warnings

For time-sensitive workflows, add SLA tracking:

```json
{
  "states": [
    {
      "id": "pending-review",
      "sla": {
        "maxDuration": 120,
        "warningAt": 96,
        "escalateTo": "Admin"
      }
    }
  ]
}
```

### 5. Audit Everything

Always set `auditAllActions: true` in settings for compliance.

### 6. Use Meaningful State Colors

- 🔵 Blue: Initial/submitted states
- 🟡 Yellow: In progress
- 🟠 Orange: Needs attention
- 🟣 Purple: Committee/board review
- 🟢 Green: Approved/completed
- 🔴 Red: Rejected/failed

---

## Security Considerations

### Access Control

The workflow engine respects Unite's existing security model:

1. **Authentication**: All API calls require valid bearer token
2. **Role-Based Access**: Transitions check `requiredRoles` and `requiredAccessLevel`
3. **Committee Membership**: `requiredCommittees` ensures only committee members can act
4. **Audit Trail**: All actions logged with hash-chain integrity

### Data Protection

- Field values stored in Vercel KV (encrypted at rest)
- Documents remain in SharePoint with existing permissions
- Audit events logged to SharePoint for long-term retention
- Workflow definitions version-controlled

### SharePoint Integration

Workflows operate **over** SharePoint's existing security:
- Entra ID authentication required
- M365 security policies apply
- SharePoint file permissions respected
- No bypass of existing DMS access controls

---

## Troubleshooting

### Workflow Not Auto-Starting

**Check**:
1. Is the workflow `isActive: true`?
2. Do assignment rules match the document properties?
3. Is priority high enough (higher priority wins)?
4. Check logs: `/api/workflow-engine?action=suggestWorkflows` with your context

### Transition Fails

**Common Causes**:
- User doesn't have required role/access level
- Required fields are missing
- Conditions not met (e.g., minimum time in state)
- Voting required but not completed

### Field Validation Errors

**Check**:
- Field type matches value type
- `validation.pattern` regex is correct
- `validation.options` includes the value
- Field is `editableInStates` for current state

---

## Monitoring & Reporting

### Get Active Workflows

```bash
POST /api/workflow-engine
{
  "action": "listInstances",
  "workflowDefinitionId": "wf-abc123",
  "status": "active"
}
```

### Check SLA Breaches

Query instances where `stateEnteredAt + sla.maxDuration < now()`

### Audit Trail

All workflow actions are logged via `AuditService`:
- Workflow started
- Transitions executed
- Fields updated
- Votes cast

Access via standard audit API with hash-chain verification.

---

## Next Steps

1. **Try a Template**: Start with the Document Approval template
2. **Create Custom Workflow**: Define your first custom workflow for your use case
3. **Test Routing**: Use `suggestWorkflows` to verify assignment rules work
4. **Monitor**: Check active instances and adjust SLAs as needed

For complex workflows requiring custom business logic, consider extending the hardcoded services (PolicyManagementService, CollegeQAService) as reference implementations.
