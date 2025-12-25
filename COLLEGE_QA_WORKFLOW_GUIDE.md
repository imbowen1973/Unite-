# College Quality Assurance & Recertification Workflow

## Overview

The College QA system manages the complete lifecycle of college/department 5-year reports, committee reviews, remediation tracking, and board recertification decisions. All interactions happen within Unite, creating a complete audit trail and ensuring recommendations aren't lost in meeting minutes.

---

## Key Features

✅ **Dedicated College Workspaces** - Each college has its own DMS folder
✅ **Interactive Review** - Committee ↔ College Q&A with evidence requests
✅ **Remediation Tracking** - Actionable items with owners and deadlines
✅ **Best Practice Repository** - Searchable, shared across all colleges
✅ **Auto-populate Board Pack** - Committee recommendations flow directly
✅ **Full Audit Trail** - Every interaction logged for compliance
✅ **Configurable Terminology** - "College", "Department", "Faculty", etc.

---

## Complete Workflow

### Phase 1: College Setup

**Admin creates college/department structure**

```bash
POST /api/college-qa
{
  "action": "createCollege",
  "code": "ENG",
  "name": "College of Engineering",
  "guestAdminUserId": "user-oid-123",
  "assignedCommittee": "academic-standards"
}
```

**What Happens:**
- ✅ Dedicated DMS folder created: `unite-qa/colleges/ENG/`
- ✅ College registered in system
- ✅ Guest admin assigned (can submit reports, respond to evidence requests)
- ✅ Assigned to reviewing committee
- ✅ 5-year countdown starts
- ✅ Certification status: `certified`

---

### Phase 2: Report Submission

**College guest admin submits 5-year report (currently from Drupal, moving to Unite)**

```bash
POST /api/college-qa
{
  "action": "submitReport",
  "collegeId": "college-uuid",
  "reportingPeriod": "2020-2025",
  "reportDocument": <ArrayBuffer of main report>,
  "evidenceDocuments": [<evidence1>, <evidence2>, <evidence3>]
}
```

**What Happens:**
- ✅ Report uploaded to college's DMS workspace
- ✅ Report ID created: `REP-ENG-2025`
- ✅ All evidence documents uploaded to same workspace
- ✅ Status: `submitted`
- ✅ Report appears in assigned committee's area
- ✅ Audit log created

**Report Workspace Structure:**
```
unite-qa/colleges/ENG/
  ├── reports/
  │   └── REP-ENG-2025/
  │       ├── main-report.pdf
  │       ├── evidence-001-assessment-data.xlsx
  │       ├── evidence-002-student-outcomes.pdf
  │       └── evidence-003-faculty-qualifications.pdf
  └── remediation/
      └── [action items will go here]
```

---

### Phase 3: Committee Review (Interactive)

#### Step 1: Assign Reviewer

```bash
POST /api/college-qa
{
  "action": "assignReviewer",
  "reportId": "report-uuid",
  "reviewerUserId": "reviewer-oid"
}
```

**What Happens:**
- ✅ Report status: `submitted` → `under-review`
- ✅ Reviewer assigned
- ✅ Review start date recorded

#### Step 2: Request Additional Evidence (Interactive Q&A)

**Committee member needs clarification or more evidence:**

```bash
POST /api/college-qa
{
  "action": "requestEvidence",
  "reportId": "report-uuid",
  "question": "Please provide detailed assessment data for graduate programs showing achievement of learning outcomes for 2020-2023",
  "category": "Assessment",
  "priority": "high"
}
```

**What Happens:**
- ✅ Evidence request created and logged
- ✅ Report status: `under-review` → `evidence-requested`
- ✅ College guest admin notified
- ✅ Request appears in college's workspace
- ✅ Audit trail updated

#### Step 3: College Responds with Evidence

**College guest admin uploads requested evidence:**

```bash
POST /api/college-qa
{
  "action": "respondToEvidence",
  "requestId": "request-uuid",
  "response": "Attached are the detailed assessment reports for all graduate programs for 2020-2023, showing achievement rates of 85% or higher for all learning outcomes.",
  "evidenceDocs": ["DOC-GRAD-ASSESS-2020", "DOC-GRAD-ASSESS-2021", ...]
}
```

**What Happens:**
- ✅ Response recorded
- ✅ Evidence documents linked to request
- ✅ Request status: `pending` → `responded`
- ✅ Report status: `evidence-requested` → `under-review`
- ✅ Committee reviewer notified
- ✅ All tracked in DMS

**Key Benefit:** No more back-and-forth emails! All Q&A happens in Unite with full audit trail.

---

### Phase 4: Identify Best Practices

**Committee reviewer spots an exemplar in the report:**

```bash
POST /api/college-qa
{
  "action": "extractBestPractice",
  "reportId": "report-uuid",
  "title": "Peer-Led Assessment Workshops for Engineering Students",
  "category": "Assessment",
  "description": "College of Engineering implemented peer-led workshops where senior students help juniors understand assessment criteria and improve their work. This resulted in 25% improvement in assignment quality and 40% reduction in assessment appeals.",
  "evidenceDocuments": ["DOC-WORKSHOP-DATA", "DOC-STUDENT-FEEDBACK"],
  "tags": ["assessment", "peer-learning", "student-success"]
}
```

**What Happens:**
- ✅ Best practice extracted and catalogued
- ✅ Status: `proposed` (committee-only visibility)
- ✅ Links back to source college and report
- ✅ Evidence attached
- ✅ Searchable by category and tags

**Later - Publish to all colleges:**

```bash
POST /api/college-qa
{
  "action": "publishBestPractice",
  "practiceId": "practice-uuid"
}
```

**What Happens:**
- ✅ Status: `proposed` → `published`
- ✅ Visibility: `committee-only` → `all-colleges`
- ✅ Appears in shared best practice repository
- ✅ All colleges can view and adopt
- ✅ Tracks adoption metrics

---

### Phase 5: Create Remediation Actions

**Committee identifies issues requiring action:**

```bash
POST /api/college-qa
{
  "action": "createRemediationAction",
  "reportId": "report-uuid",
  "category": "Faculty Development",
  "issue": "Only 60% of faculty have completed assessment training (target: 90%)",
  "recommendation": "Implement mandatory assessment training for all faculty by end of academic year",
  "priority": "high",
  "assignedTo": ["dean-oid", "assessment-coordinator-oid"],
  "dueDate": "2025-08-31T00:00:00Z",
  "completionCriteria": "90% of faculty have completed assessment training module and received certification"
}
```

**What Happens:**
- ✅ Remediation action created
- ✅ Assigned to specific people (dean, coordinator)
- ✅ Due date set
- ✅ Status: `open`
- ✅ Tracked separately (not buried in meeting minutes!)
- ✅ Can be linked to Microsoft Planner for task management
- ✅ Progress tracked until completion

**Multiple actions can be created for different issues.**

---

### Phase 6: Committee Recommendation

**After review complete, committee creates formal recommendation:**

```bash
POST /api/college-qa
{
  "action": "createRecommendation",
  "reportId": "report-uuid",
  "recommendation": "approve-with-conditions",
  "conditions": [
    "Complete mandatory assessment training for all faculty by August 2025",
    "Submit progress report on graduate program improvements by December 2025"
  ],
  "commendations": [
    "Excellent peer-led assessment workshops showing measurable impact",
    "Strong student satisfaction scores (92% average)",
    "Innovative use of technology in remote learning"
  ],
  "concerns": [
    "Faculty assessment training completion rate below target",
    "Limited diversity in graduate program recruitment"
  ],
  "remediationActionIds": ["action-1-uuid", "action-2-uuid", "action-3-uuid"],
  "bestPracticeIds": ["bp-1-uuid", "bp-2-uuid"],
  "reviewSummary": "College of Engineering demonstrates strong performance across most areas with particular excellence in peer-led learning initiatives. Remediation required in faculty development. Recommend approval with conditions to be verified by December 2025."
}
```

**What Happens:**
- ✅ Formal recommendation created
- ✅ Links to all remediation actions
- ✅ Links to all best practices identified
- ✅ Report status: `under-review` → `completed`
- ✅ Ready for board review

---

### Phase 7: Add to Board Pack (Automatic Population)

**Committee chair adds recommendation to board meeting:**

```bash
POST /api/college-qa
{
  "action": "addToBoardPack",
  "recommendationId": "rec-uuid",
  "boardMeetingId": "board-mtg-uuid"
}
```

**What Happens:**
- ✅ Recommendation auto-formatted for board pack
- ✅ Added as agenda item to board meeting
- ✅ Includes all: commendations, concerns, conditions, remediation actions
- ✅ Report status: `completed` → `board-review`
- ✅ Vote automatically created for agenda item
- ✅ Board pack includes summary + link to full report

**Auto-Generated Board Pack Content:**

```markdown
## Recertification Recommendation: College of Engineering

**Reporting Period:** 2020-2025
**Committee Recommendation:** APPROVE WITH CONDITIONS

### Commendations
- Excellent peer-led assessment workshops showing measurable impact
- Strong student satisfaction scores (92% average)
- Innovative use of technology in remote learning

### Concerns
- Faculty assessment training completion rate below target (60% vs 90%)
- Limited diversity in graduate program recruitment

### Conditions for Approval
- Complete mandatory assessment training for all faculty by August 2025
- Submit progress report on graduate program improvements by December 2025

### Remediation Actions Required
**Count:** 3 actions with assigned owners and deadlines

### Best Practices Identified
**Count:** 2 practices recommended for organization-wide adoption

### Summary
College of Engineering demonstrates strong performance across most areas...
[Full committee summary]
```

**Key Benefit:** Committee recommendations flow directly into board pack - no manual copying from meeting minutes!

---

### Phase 8: Board Vote & Recertification

**During board meeting, vote conducted:**

```bash
# Vote conducted via voting API
POST /api/voting
{ "action": "castVote", "voteId": "vote-uuid", "voteOption": "Yes" }

# After vote passes, record board decision
POST /api/college-qa
{
  "action": "recordBoardDecision",
  "recommendationId": "rec-uuid",
  "voteId": "vote-uuid",
  "approved": true,
  "effectiveDate": "2025-09-01T00:00:00Z"
}
```

**What Happens:**
- ✅ Board decision recorded
- ✅ Report status: `board-review` → `approved`
- ✅ College certification status updated: `certified` (or `provisional` if conditions)
- ✅ Certification expiry date set (effective date + 5 years)
- ✅ Next report due date calculated (5 years from effective date)
- ✅ Complete audit trail from submission to approval

**If Approved with Conditions:**
- ✅ Status: `certified` with conditions tracked
- ✅ Remediation actions remain `open` until completed
- ✅ Progress tracked in system
- ✅ College must submit evidence of completion by due dates

---

## Complete Workflow Diagram

```
College Guest Admin                Committee                    Board
       |                               |                           |
       | 1. Submit Report              |                           |
       |------------------------------>|                           |
       |                               |                           |
       |                               | 2. Assign Reviewer        |
       |                               |--------->                 |
       |                               |                           |
       |                               | 3. Review Report          |
       |                               | (following SOP)           |
       |                               |                           |
       | <-----------------------------| 4. Request Evidence       |
       | "Need graduate outcomes data" |                           |
       |                               |                           |
       | 5. Upload Evidence            |                           |
       |------------------------------>|                           |
       |                               |                           |
       |                               | 6. Extract Best Practice  |
       |                               | (peer-led workshops)      |
       |                               |                           |
       |                               | 7. Create Remediation     |
       |                               | (faculty training)        |
       |                               |                           |
       |                               | 8. Create Recommendation  |
       |                               | (approve-with-conditions) |
       |                               |                           |
       |                               | 9. Add to Board Pack      |
       |                               |-------------------------->|
       |                               |                           |
       |                               |                           | 10. Vote
       |                               |                           | (8-0-1 Pass)
       |                               |                           |
       | <---------------------------------------------------------| 11. Recertified
       | (Certified for 5 years with conditions)                   |
       |                               |                           |
       | 12. Work on Remediation       |                           |
       | (tracked in system)           |                           |
```

---

## Best Practice Repository

### Viewing Best Practices (All Colleges)

All published best practices visible in shared repository:

```
Categories:
- Assessment
- Teaching & Learning
- Student Support
- Faculty Development
- Research & Scholarship
- Community Engagement

Each practice shows:
- Title & Description
- Source College
- Evidence of Effectiveness
- How to Adopt
- Metrics (views, adoptions)
- Tags for searching
```

### Adopting Best Practices

Colleges can mark practices they're adopting:
- Tracked in system
- Metrics updated
- Can request guidance from source college

---

## Remediation Tracking

### Remediation Action Lifecycle

```
open → in-progress → completed
  ↓
overdue (if past due date)
```

**Progress Updates:**
- Assigned owners can update status
- Evidence of completion uploaded
- Committee verifies completion
- Linked to college's next report if unresolved

**Key Benefit:** Remediation actions don't get lost! They're tracked until completion with owners, deadlines, and evidence requirements.

---

## DMS Workspace Structure

Each college has dedicated, auditable workspace:

```
unite-qa/
├── colleges/
│   ├── ENG/  (College of Engineering)
│   │   ├── reports/
│   │   │   ├── REP-ENG-2020/
│   │   │   │   ├── main-report.pdf
│   │   │   │   └── evidence/
│   │   │   └── REP-ENG-2025/
│   │   │       ├── main-report.pdf
│   │   │       ├── evidence/
│   │   │       └── evidence-requests/
│   │   │           ├── request-001-response.pdf
│   │   │           └── request-002-response.xlsx
│   │   └── remediation/
│   │       ├── action-001-training-evidence.pdf
│   │       └── action-002-diversity-plan.pdf
│   │
│   ├── MED/  (College of Medicine)
│   ├── BUS/  (College of Business)
│   └── ...
│
└── best-practices/
    ├── assessment/
    ├── teaching/
    └── ...
```

**Access Control:**
- College guest admin: Read/write to their college folder
- Committee: Read all, write to all
- Board: Read all
- Other colleges: Read best practices only

---

## Audit Trail Example

**Every interaction logged:**

```
1. college.report.submitted
   → College of Engineering submits REP-ENG-2025

2. college.report.reviewer.assigned
   → Dr. Smith assigned as reviewer

3. college.evidence.requested
   → Request #1: Graduate program assessment data

4. college.evidence.provided
   → Response with 3 evidence documents

5. college.evidence.requested
   → Request #2: Faculty qualification details

6. college.evidence.provided
   → Response with updated CV database

7. best.practice.extracted
   → BP-ASSESSMENT-2025-001: Peer-led workshops

8. remediation.action.created
   → Action #1: Faculty training (high priority)

9. remediation.action.created
   → Action #2: Diversity recruitment plan

10. committee.recommendation.created
    → Recommendation: Approve with conditions

11. recommendation.added.board.pack
    → Added to Board Meeting March 2025

12. board.decision.recorded
    → Vote passed 8-0-1, Recertification approved

13. college.certification.updated
    → Status: Certified until 2030-09-01
```

**Hash-chain integrity:** All events tamper-proof with audit chain.

---

## Integration Points

### With Meeting System
- ✅ Committee meetings track which reports reviewed
- ✅ Board meetings include recertification votes
- ✅ Meeting minutes link to full QA records

### With Document Workflow
- ✅ All documents flow through approval process
- ✅ Version control maintained
- ✅ Access permissions enforced

### With Microsoft Planner
- ✅ Remediation actions create Planner tasks
- ✅ Status synchronized
- ✅ Assigned owners get notifications

### With Audit System
- ✅ Complete audit trail
- ✅ Compliance evidence for accreditation
- ✅ ISO 27001 compatible

---

## Key Differentiators from Old Process

| Old Process | New Unite Process |
|-------------|-------------------|
| Report uploaded to Drupal | Report submitted directly in Unite |
| Committee reviews offline | Interactive review in Unite |
| Email requests for evidence | Tracked evidence requests in system |
| Recommendations in meeting minutes | Structured recommendations in database |
| Remediation buried in minutes | Trackable actions with owners & deadlines |
| Best practices in informal notes | Searchable repository with evidence |
| Manual board pack preparation | Auto-populated from committee recommendations |
| Limited audit trail | Complete tamper-proof audit chain |
| Progress tracking via email | Real-time status tracking in system |

---

## Configurable Terminology

The system uses "College" by default, but can be configured:

```typescript
// Configuration
const ORGANIZATION_UNIT_TERMINOLOGY = {
  singular: "College",      // or "Department", "Faculty", "School"
  plural: "Colleges",       // or "Departments", "Faculties", "Schools"
  abbreviation: "COL"       // or "DEPT", "FAC", "SCH"
}
```

All UI labels and report IDs adapt to configured terminology.

---

## Benefits Summary

### For Colleges
✅ Single workspace for all QA activities
✅ Clear evidence requests with trackable responses
✅ Visibility into committee feedback
✅ Remediation progress tracking
✅ Access to best practices from peers

### For Committees
✅ Structured review process following SOP
✅ Interactive Q&A with colleges (no email chaos)
✅ Best practice extraction during review
✅ Remediation actions tracked to completion
✅ Recommendations flow to board automatically

### For Board
✅ Clear, structured recommendations
✅ Complete context in board pack
✅ Trackable vote outcomes
✅ Remediation progress visibility
✅ Organization-wide best practices

### For Organization
✅ Complete audit trail for accreditation
✅ No recommendations lost in minutes
✅ Cross-college learning via best practices
✅ Data-driven quality improvement
✅ ISO 27001 compliance evidence

---

## Security & Compliance

✅ **Role-based access control** - Colleges see only their data
✅ **Committee workspace isolation** - Secure review environment
✅ **Audit logging** - Every interaction logged
✅ **Hash-chain integrity** - Tamper-proof records
✅ **Evidence tracking** - All documents in DMS
✅ **Permission enforcement** - API-level security

---

## Production Ready

The College QA system is **production-ready** with:
- ✅ Complete service implementation
- ✅ Interactive review workflow
- ✅ Remediation tracking
- ✅ Best practice repository
- ✅ Board integration
- ✅ Full audit trail
- ✅ Security hardened
- ✅ API endpoints
- ✅ Comprehensive documentation

---

**Last Updated:** 2025-12-24
**Status:** ✅ Production Ready
