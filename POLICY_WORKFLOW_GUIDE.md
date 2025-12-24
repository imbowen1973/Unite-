# Policy Management Workflow Guide

## Overview

The Policy Management Service implements a specialized workflow for policies and procedures with unique requirements:

- **Two-stage approval**: Executive → Board
- **Complete version history** with diffs
- **5-year review cycle** with warnings
- **Superseding logic** for old versions
- **Compliance framework mapping**
- **Effective date separate from approval date**

---

## Complete Policy Workflow

### Step 1: Create New Policy

**Endpoint:** `POST /api/policies`

**Request:**
```json
{
  "action": "create",
  "title": "Information Security Policy",
  "description": "Organizational information security requirements and controls",
  "category": "Information Security",
  "content": <ArrayBuffer of policy document>,
  "complianceFrameworks": ["ISO 27001:2022", "GDPR", "SOC2"],
  "owner": "security-officer-oid",
  "reviewCycle": 5
}
```

**Response:**
```json
{
  "id": "uuid",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "versionNumber": "1.0",
  "title": "Information Security Policy",
  "status": "draft",
  "nextReviewDate": "2030-01-15T00:00:00Z",
  ...
}
```

**Key Features:**
- ✅ Creates policy with `POL-CATEGORY-UUID` stable ID
- ✅ Initializes version at 1.0
- ✅ Sets 5-year review cycle automatically
- ✅ Creates version history entry
- ✅ Audits creation event

---

### Step 2: Submit for Executive Review

**Endpoint:** `POST /api/policies`

**Request:**
```json
{
  "action": "submitForExecutiveReview",
  "policyId": "uuid-from-step-1",
  "reason": "Initial policy ready for executive review"
}
```

**Response:**
```json
{
  "id": "uuid",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "status": "executive-review",
  ...
}
```

**What Happens:**
- ✅ Status changes: `draft` → `executive-review`
- ✅ Underlying document submitted for approval
- ✅ Audit log created
- ✅ Executives notified (via SharePoint/Teams)

---

### Step 3: Executive Approval (First Stage)

**Endpoint:** `POST /api/policies`

**Request:**
```json
{
  "action": "approveByExecutive",
  "policyId": "uuid-from-step-1",
  "reason": "Policy meets organizational standards, forwarding to board"
}
```

**Response:**
```json
{
  "id": "uuid",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "status": "board-review",
  ...
}
```

**What Happens:**
- ✅ Status changes: `executive-review` → `board-review`
- ✅ Document approval workflow progresses
- ✅ Board members notified
- ✅ Audit log created

**Permissions Required:** Executive or Admin role

---

### Step 4: Board Approval (Second Stage - Final)

**Endpoint:** `POST /api/policies`

**Request:**
```json
{
  "action": "approveByBoard",
  "policyId": "uuid-from-step-1",
  "effectiveDate": "2025-02-01T00:00:00Z",
  "reason": "Approved by board vote on 2025-01-15"
}
```

**Response:**
```json
{
  "id": "uuid",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "status": "approved",
  "approvalDate": "2025-01-15T10:30:00Z",
  "effectiveDate": "2025-02-01T00:00:00Z",
  ...
}
```

**What Happens:**
- ✅ Status changes: `board-review` → `approved`
- ✅ Approval date recorded
- ✅ Effective date set (can be future date)
- ✅ Audit log created
- ✅ Ready for publication

**Permissions Required:** Board member with `canApprove` permission

**Important:** `effectiveDate` can be different from `approvalDate` (e.g., policy approved in January but effective February 1st)

---

### Step 5: Publish Policy

**Endpoint:** `POST /api/policies`

**Request:**
```json
{
  "action": "publish",
  "policyId": "uuid-from-step-1"
}
```

**Response:**
```json
{
  "id": "uuid",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "status": "published",
  "publishedDate": "2025-01-15T14:00:00Z",
  ...
}
```

**What Happens:**
- ✅ Status changes: `approved` → `published`
- ✅ If previous version exists, it's automatically superseded
- ✅ Old version status: `published` → `superseded`
- ✅ Document published to public website
- ✅ Board can still access superseded versions
- ✅ Public sees only current version
- ✅ Audit log created

**Permissions Required:** User with `canPublish` permission

---

## Updating Existing Policies (Versioning)

### Propose Change to Published Policy

**Endpoint:** `POST /api/policies`

**Request:**
```json
{
  "action": "proposeChange",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "changesSummary": "Added cloud security requirements",
  "changesDetail": "Added sections 4.5-4.7 covering cloud service security controls, data residency requirements, and third-party cloud provider assessments",
  "impactAssessment": "Medium impact - requires IT department training on new cloud controls",
  "affectedSections": ["Section 4", "Appendix B"]
}
```

**Response:**
```json
{
  "id": "proposal-uuid",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "proposedVersion": "1.1",
  "status": "proposed",
  ...
}
```

**What Happens:**
- ✅ Creates change proposal
- ✅ Increments version (1.0 → 1.1)
- ✅ Requires same two-stage approval
- ✅ Original version remains published until new version published

**Then:** Follow steps 2-5 again for the new version

---

## Version Management

### Get Version History

**Endpoint:** `GET /api/policies?action=getVersionHistory&policyStableId=POL-XXX`

**Response:**
```json
[
  {
    "versionNumber": "2.0",
    "status": "published",
    "effectiveDate": "2025-01-01T00:00:00Z",
    "publishedDate": "2024-12-15T00:00:00Z",
    "changesSummary": "Major revision for ISO 27001:2022 compliance"
  },
  {
    "versionNumber": "1.1",
    "status": "superseded",
    "supersededBy": "POL-INFORMATION-SECURITY-ABC12345",
    "effectiveDate": "2024-06-01T00:00:00Z",
    "publishedDate": "2024-05-15T00:00:00Z"
  },
  {
    "versionNumber": "1.0",
    "status": "superseded",
    "effectiveDate": "2023-01-01T00:00:00Z",
    "publishedDate": "2022-12-01T00:00:00Z"
  }
]
```

**Access Control:**
- ✅ Board members: See ALL versions (including superseded)
- ✅ Executives: See ALL versions
- ✅ Public/other users: See ONLY current published version

---

### Compare Versions (Diff)

**Endpoint:** `POST /api/policies`

**Request:**
```json
{
  "action": "getPolicyDiff",
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "fromVersion": "1.0",
  "toVersion": "1.1"
}
```

**Response:**
```json
{
  "policyStableId": "POL-INFORMATION-SECURITY-ABC12345",
  "fromVersion": "1.0",
  "toVersion": "1.1",
  "changes": [
    {
      "section": "Section 4.5",
      "changeType": "added",
      "newContent": "Cloud security requirements...",
      "lineNumber": 142
    },
    {
      "section": "Section 3.2",
      "changeType": "modified",
      "oldContent": "Annual security assessments required",
      "newContent": "Bi-annual security assessments required",
      "lineNumber": 87
    }
  ],
  "generatedAt": "2025-01-15T10:00:00Z"
}
```

---

## 5-Year Review Cycle

### Get Policies Requiring Review

**Endpoint:** `GET /api/policies?action=getPoliciesRequiringReview&warningMonths=6`

**Response:**
```json
[
  {
    "policyStableId": "POL-HR-POLICY-XYZ",
    "title": "HR Data Protection Policy",
    "nextReviewDate": "2025-06-01T00:00:00Z",
    "daysSinceLastReview": 1780,
    "status": "published"
  },
  {
    "policyStableId": "POL-FINANCE-ABC",
    "title": "Financial Controls Policy",
    "nextReviewDate": "2025-08-15T00:00:00Z",
    "daysSinceLastReview": 1700,
    "status": "published"
  }
]
```

**Parameters:**
- `warningMonths`: How many months before review date to show warnings (default: 6)

**Use Case:**
- ✅ Admin dashboard shows policies approaching review
- ✅ Automated reminders sent to policy owners
- ✅ Board receives quarterly report on overdue reviews

---

## Compliance Framework Mapping

Policies include `complianceFrameworks` field:

```json
{
  "complianceFrameworks": [
    "ISO 27001:2022",
    "GDPR Article 32",
    "SOC2 CC6.1",
    "NIST 800-53",
    "PCI-DSS 12.1"
  ]
}
```

**Benefits:**
- ✅ Track which policies cover which compliance requirements
- ✅ Generate compliance coverage reports
- ✅ Identify gaps in compliance framework coverage
- ✅ Audit evidence for ISO 27001 certification

---

## Access Control Summary

| User Role | Can Create | Exec Approve | Board Approve | Publish | View All Versions |
|-----------|-----------|--------------|---------------|---------|-------------------|
| Public | ❌ | ❌ | ❌ | ❌ | ❌ (current only) |
| Member | ❌ | ❌ | ❌ | ❌ | ❌ (current only) |
| Executive | ✅ | ✅ | ❌ | ❌ | ✅ |
| Board Member | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Integration with Meeting Workflow

When board approves a policy during a meeting:

1. **Agenda Item Created:**
   ```json
   {
     "action": "addAgendaItem",
     "meetingId": "mtg-123",
     "title": "Approve Information Security Policy v1.0",
     "role": "voting",
     "voteRequired": "approval",
     "voteType": "simple-majority",
     "supportingDocuments": ["DOC-ABC123"]  // Policy document
   }
   ```

2. **Vote Conducted During Meeting**

3. **If Vote Passes:**
   ```json
   {
     "action": "approveByBoard",
     "policyId": "policy-uuid",
     "effectiveDate": "2025-02-01T00:00:00Z",
     "reason": "Approved by board vote on 2025-01-15 (8 Yes, 0 No, 1 Abstain)"
   }
   ```

4. **Policy Published:**
   ```json
   {
     "action": "publish",
     "policyId": "policy-uuid"
   }
   ```

---

## Audit Trail Example

Every policy operation is logged:

```
1. policy.created → User creates draft
2. policy.submitted.executive → Submitted for executive review
3. policy.approved.executive → Executive approves
4. policy.submitted.board → Forwarded to board
5. policy.approved.board → Board approves (with vote reference)
6. policy.superseded → Old version marked superseded
7. policy.published → New version published
```

All entries include:
- ✅ Who performed the action
- ✅ When it happened
- ✅ What changed
- ✅ Reason/justification
- ✅ Correlation ID for traceability
- ✅ Hash-chain integrity

---

## Error Handling

All API endpoints return standardized errors:

```json
{
  "error": "Only executives can approve policies at this stage"
}
```

**Common Errors:**
- `Authentication required` (401)
- `Only executives can...` (403)
- `Policy must be in executive review to approve` (400)
- `effectiveDate is required for board approval` (400)
- `One or both versions not found` (404)

---

## Key Differences from Regular Documents

| Feature | Regular Document | Policy Document |
|---------|-----------------|-----------------|
| Approval Stages | 1 (generic approval) | 2 (Executive → Board) |
| Version History | Optional | **Mandatory** |
| Review Cycle | None | **5 years mandatory** |
| Superseding | Manual | **Automatic on publish** |
| Public Access | Based on ACL | **Current only** |
| Board Access | Based on ACL | **All versions** |
| Effective Date | ❌ | ✅ Separate from approval |
| Compliance Mapping | ❌ | ✅ Built-in |

---

## Example: Complete Policy Lifecycle

```bash
# 1. Create policy
POST /api/policies
{ "action": "create", "title": "GDPR Compliance Policy", ... }
→ Returns: { policyStableId: "POL-GDPR-XYZ", versionNumber: "1.0", status: "draft" }

# 2. Submit for executive review
POST /api/policies
{ "action": "submitForExecutiveReview", "policyId": "uuid" }
→ status: "executive-review"

# 3. Executive approves
POST /api/policies
{ "action": "approveByExecutive", "policyId": "uuid" }
→ status: "board-review"

# 4. Board approves (after meeting vote)
POST /api/policies
{ "action": "approveByBoard", "policyId": "uuid", "effectiveDate": "2025-02-01" }
→ status: "approved", effectiveDate: "2025-02-01"

# 5. Publish (on effective date)
POST /api/policies
{ "action": "publish", "policyId": "uuid" }
→ status: "published", old version superseded

# ... 4.5 years later ...

# 6. Get policies needing review
GET /api/policies?action=getPoliciesRequiringReview&warningMonths=6
→ Returns: [ { policyStableId: "POL-GDPR-XYZ", nextReviewDate: "2029-08-01" } ]

# 7. Propose update
POST /api/policies
{ "action": "proposeChange", "policyStableId": "POL-GDPR-XYZ", ... }
→ Returns: { proposedVersion: "1.1" }

# 8. Repeat steps 2-5 for new version
→ v1.1 published, v1.0 superseded but still accessible to board
```

---

## Security Features

✅ **Two-stage approval prevents single-point-of-failure**
✅ **Complete audit trail for compliance**
✅ **Version history tamper-proof**
✅ **Access control enforced at API level**
✅ **Input validation prevents injection**
✅ **Error messages sanitized**
✅ **Cryptographically secure IDs**
✅ **Race condition protection on publish**

---

## Ready for Production

The Policy Management Service is **production-ready** with all edge cases handled:
- ✅ Complete two-stage approval workflow
- ✅ Version history with diff support
- ✅ 5-year review cycle tracking
- ✅ Automatic superseding logic
- ✅ Role-based access to versions
- ✅ Compliance framework mapping
- ✅ Effective date tracking
- ✅ Integration with meeting/voting workflow
- ✅ Comprehensive audit logging
- ✅ Security hardened

---

**Last Updated:** 2025-12-24
**Status:** ✅ Production Ready
