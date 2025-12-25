# Workflow Builder User Guide

## Overview

The **Workflow Builder** is a visual drag-and-drop interface for creating custom workflows without writing code. Build approval processes, complaint handling workflows, review workflows, and more - all through an intuitive visual interface.

## Getting Started

### Accessing the Workflow Builder

1. Navigate to `/workflow-builder` in your browser
2. Or click "New Workflow" from the Workflows gallery at `/workflows`

### Your First Workflow

Let's create a simple document approval workflow:

1. **Set Workflow Info** (top bar):
   - Name: "Department Report Approval"
   - Description: "Approval workflow for department reports"
   - Category: "Approval"

2. **Add States**:
   - Click "Add State" button (top-left)
   - Create "Draft" state (mark as START/Initial)
   - Create "Pending Review" state
   - Create "Approved" state (mark as END/Final)

3. **Connect States**:
   - Drag from the bottom handle of "Draft" to the top of "Pending Review"
   - Drag from "Pending Review" to "Approved"
   - Transitions appear as animated arrows

4. **Configure Transitions**:
   - Click on an arrow/transition
   - Set label: "Submit for Review", "Approve"
   - Add requirements (comment, vote, etc.)

5. **Add Fields**:
   - Click "Fields" in left sidebar
   - Add "Document Title" (text, required)
   - Add "Approver" (user, required)

6. **Set Assignment Rules**:
   - Click "Assignment Rules" in left sidebar
   - Add rule: Document Type = "report", Committee = "DepartmentHeads"
   - This auto-starts the workflow when matching documents are created

7. **Save**:
   - Click "Validate" to check for errors
   - Click "Save Workflow" to publish

---

## Interface Components

### Main Canvas

The central area where you build your workflow visually.

**Controls**:
- **Add State**: Creates new state nodes
- **Fit View**: Centers and fits all states in view
- **Zoom**: Mouse wheel or controls (bottom-right)
- **Pan**: Click and drag on empty canvas area
- **Minimap**: Overview navigation (bottom-right corner)

**Connections**:
- Drag from a state's **bottom handle** (source)
- Drop on another state's **top handle** (target)
- This creates a transition arrow

### State Nodes

Visual boxes representing workflow stages.

**Colors Indicate Purpose**:
- 🔵 **Blue**: Initial/submitted states
- 🟡 **Yellow**: In progress
- 🟠 **Orange**: Needs attention
- 🟣 **Purple**: Committee/board review
- 🟢 **Green**: Approved/completed
- 🔴 **Red**: Rejected/failed
- ⚫ **Gray**: Draft

**Badges**:
- **START**: Initial state (workflow begins here)
- **END**: Final state (workflow completes)
- **Clock icon**: Has SLA time limits

**Click** on a state to edit it.

### State Configuration Panel

Opens when you click a state or "Add State".

**Basic Info**:
- **Label**: State name (e.g., "Under Review")
- **Description**: What happens in this state
- **Color**: Visual indicator

**State Type**:
- **Initial State (START)**: Workflow begins here (exactly 1 required)
- **Final State (END)**: Workflow completes here (at least 1 required)

**Allowed Actions**:
Select what users can do in this state:
- `view`: Can view documents
- `edit`: Can edit documents
- `comment`: Can add comments
- `upload_evidence`: Can attach files
- `approve`/`reject`: Can approve or reject

**SLA (Service Level Agreement)**:
- **Max Duration**: Hours allowed in this state (e.g., 120 = 5 days)
- **Warning At**: Send warning after X hours
- **Escalate To**: Role to notify on SLA breach

### Transition Configuration Panel

Opens when you click a transition arrow.

**Basic Info**:
- **Button Label**: What users see (e.g., "Submit for Approval")

**Requirements**:
- **Require Comment**: User must explain their action
- **Require Vote**: Committee/board must vote
  - Simple Majority: More "for" than "against"
  - Two-Thirds: At least 67% vote "for"
  - Unanimous: All vote "for", none "against"
- **Require Attachments**: Must upload documents

**Permissions**:
- **Required Roles**: Only these roles can perform this transition
  - Examples: Admin, Board, ComplaintsOfficer
  - Comma-separated list

**Confirmation**:
- **Confirmation Message**: Show before executing (e.g., "Are you sure?")

### Fields Panel

Define custom data fields for your workflow.

**Adding Fields**:
1. Enter field name (technical, e.g., `complainantName`)
2. Enter field label (user-friendly, e.g., "Complainant Name")
3. Select field type
4. Check "Required" if mandatory
5. Click "Add Field"

**Field Types**:
- **Text**: Free-form text input
- **Number**: Numeric input
- **Date**: Date picker
- **Boolean**: Checkbox (yes/no)
- **Select**: Dropdown (single choice)
- **Multi-Select**: Multiple choices

**Examples**:
```
Name: complainantName
Label: Complainant Name
Type: Text
Required: Yes

Name: severity
Label: Issue Severity
Type: Select
Options: Low, Medium, High, Critical
Required: Yes

Name: estimatedValue
Label: Estimated Value (£)
Type: Number
Required: No
```

### Assignment Rules Panel

Determines when this workflow automatically applies.

**How It Works**:
When a document is created or assigned to a committee, the system checks all active workflows. If a document matches ALL criteria in a rule, that workflow auto-starts.

**Rule Criteria**:
- **Priority**: Higher priority rules are checked first (default: 10)
- **Document Types**: e.g., complaint, report, contract
- **Categories**: e.g., student, staff, financial
- **Committees**: e.g., StudentWelfare, AcademicStandards
- **Tags**: e.g., urgent, high-value

**All criteria must match** for the rule to apply.

**Examples**:

**Example 1 - Student Complaints**:
```
Priority: 10
Document Types: complaint
Categories: student
Committees: StudentWelfare
Tags: (leave empty)
```
Matches: Documents with type="complaint" AND category="student" AND assigned to "StudentWelfare" committee

**Example 2 - High-Value Contracts**:
```
Priority: 20
Document Types: contract
Categories: international
Committees: (leave empty)
Tags: high-value
```
Matches: Documents with type="contract" AND category="international" AND tagged "high-value"

**Example 3 - Urgent Issues**:
```
Priority: 15
Document Types: (leave empty)
Categories: (leave empty)
Committees: (leave empty)
Tags: urgent, critical
```
Matches: Any document tagged with "urgent" OR "critical"

---

## Common Workflows

### Simple Approval Workflow

```
States:
1. Draft [START] (gray)
2. Pending Review (blue)
3. Approved [END] (green)
4. Rejected [END] (red)

Transitions:
Draft → Pending Review (label: "Submit")
Pending Review → Approved (label: "Approve", requires: Admin role)
Pending Review → Rejected (label: "Reject", requires: Admin role, comment required)
```

### Complaint Handling Workflow

```
States:
1. Submitted [START] (blue)
2. Under Review (yellow)
3. Investigation (orange)
4. Committee Review (purple)
5. Resolved [END] (green)
6. Rejected [END] (red)

Transitions:
Submitted → Under Review (label: "Assign for Review")
Under Review → Investigation (label: "Start Investigation", comment required)
Under Review → Resolved (label: "Resolve Without Investigation")
Under Review → Rejected (label: "Reject Complaint")
Investigation → Committee Review (label: "Escalate to Committee")
Investigation → Resolved (label: "Resolve")
Committee Review → Resolved (label: "Approve Resolution", requires: voting)
Committee Review → Rejected (label: "Reject", requires: voting)

SLA:
Under Review: 120 hours max, warn at 96 hours
Investigation: 480 hours max, warn at 384 hours
```

### Research Ethics Review

```
States:
1. Submitted [START] (blue)
2. Initial Review (yellow)
3. Revisions Requested (orange)
4. Committee Review (purple)
5. Approved [END] (green)
6. Rejected [END] (red)

Transitions:
Submitted → Initial Review
Initial Review → Revisions Requested (comment required)
Initial Review → Committee Review
Revisions Requested → Initial Review (label: "Resubmit")
Committee Review → Approved (requires: voting, simple majority)
Committee Review → Rejected (requires: voting, comment required)
```

---

## Best Practices

### 1. Start Simple

Begin with 3-5 states. You can always add complexity later.

**Good First Workflow**:
```
Draft → Review → Approved/Rejected
```

### 2. Use Meaningful Colors

- Blue for new submissions
- Yellow/Orange for active work
- Purple for committee review
- Green for approved
- Red for rejected
- Gray for drafts

### 3. Clear State Labels

**Good**: "Under Investigation", "Pending Board Approval", "Resolved"
**Bad**: "State 1", "Processing", "Done"

### 4. Descriptive Transition Labels

**Good**: "Submit for Approval", "Approve with Conditions", "Escalate to Committee"
**Bad**: "Next", "OK", "Move"

### 5. Require Comments for Important Actions

Always require comments for:
- Rejections
- Escalations
- State reversals

### 6. Set Appropriate SLAs

**Academic complaints**: 5 days (120 hours) for initial review
**Research ethics**: 7 days (168 hours) for initial review
**Simple approvals**: 2 days (48 hours)

Warn at 80% of max duration.

### 7. Assignment Rules Priority

Use priority to handle overlapping rules:
- **20**: Specific/urgent workflows
- **10**: Standard workflows
- **5**: Catch-all/default workflows

### 8. Validate Early, Validate Often

Click "Validate" frequently to catch errors:
- Missing START state
- Missing END state
- Orphaned states (no connections)
- Invalid transitions

---

## Keyboard Shortcuts

- **Space + Drag**: Pan canvas
- **Scroll**: Zoom in/out
- **Click State**: Edit state
- **Click Arrow**: Edit transition
- **Delete Key**: Delete selected (confirmation required)
- **Ctrl/Cmd + S**: Save workflow (when implemented)

---

## Validation Checklist

Before saving, ensure:

- [ ] Workflow has a name
- [ ] Exactly ONE state marked as START (Initial)
- [ ] At least ONE state marked as END (Final)
- [ ] All states are connected (no orphans)
- [ ] All transitions have labels
- [ ] Assignment rules are configured (if auto-routing needed)
- [ ] Required fields are defined
- [ ] SLAs are reasonable for your use case

---

## Exporting & Importing

### Export to JSON

Click "Export" to download your workflow as JSON. Useful for:
- Backup
- Version control
- Sharing with other admins
- Template creation

### Import from JSON

(Coming soon) Upload a JSON file to load a workflow.

---

## Troubleshooting

### "Workflow must have exactly one initial state"

**Problem**: No state marked as START, or multiple START states
**Fix**: Edit states, ensure exactly one has "Initial State (START)" checked

### "Workflow must have at least one final state"

**Problem**: No states marked as END
**Fix**: Mark at least one state as "Final State (END)" (approved, rejected, completed, etc.)

### "Transition references unknown state"

**Problem**: A transition connects to a deleted state
**Fix**: Delete the broken transition and recreate it

### Workflow not auto-starting

**Check**:
1. Is workflow marked as "Active"?
2. Do assignment rules match document properties exactly?
3. Is priority high enough (other workflows might match first)?
4. Are document type/category/committee spelled correctly?

### Can't connect states

**Problem**: Dragging doesn't create connection
**Fix**:
- Drag from **bottom handle** of source state
- Drop on **top handle** of target state
- Ensure you're not in a configuration panel

---

## Advanced Features

### Conditional Transitions (Coming Soon)

Add conditions based on field values:
```
If severity = "Critical" → Escalate immediately
If value > £50,000 → Require board approval
```

### Automated Actions (Coming Soon)

Configure automatic actions when entering states:
- Send email notifications
- Create Microsoft Planner tasks
- Move documents to folders
- Update SharePoint fields

### Parallel Approval (Coming Soon)

Multiple approvers must approve concurrently before proceeding.

---

## Integration with Existing Workflows

The Workflow Builder complements hardcoded workflows:

| **Use Workflow Builder For** | **Use Hardcoded Services For** |
|-------------------------------|--------------------------------|
| Standard approvals | Policy management (versioning, superseding) |
| Complaint handling (repetitive) | College QA (interactive evidence) |
| Ethics reviews | Meeting management (AI summaries) |
| Document routing | Complex business logic |
| Committee reviews | Multi-system integrations |

**Both integrate seamlessly** with the same DMS, audit trail, and access control.

---

## Tips for Power Users

1. **Template Approach**: Create a "template" workflow, export it, then import and customize for similar processes

2. **Naming Convention**: Use prefixes for organization:
   - `COMP-Student` (Complaints - Student)
   - `APPR-Report` (Approval - Report)
   - `ETH-Research` (Ethics - Research)

3. **Field Reuse**: Define common fields once, reuse in multiple workflows

4. **Test with Low Priority**: Set new workflows to priority 1 initially, increase after testing

5. **Document Your Rules**: Add descriptions explaining why assignment rules are configured certain ways

---

## Support & Resources

- **Workflow Engine Guide**: See `WORKFLOW_ENGINE_GUIDE.md` for API and technical details
- **Pre-built Templates**: Check `/lib/workflow-engine/templates.ts` for ready-to-use workflows
- **API Documentation**: See Workflow Engine API for integration with custom code

---

## Quick Reference

### State Colors
| Color | Purpose |
|-------|---------|
| Gray | Draft/initial |
| Blue | Submitted/new |
| Yellow | In progress |
| Orange | Needs attention |
| Purple | Committee review |
| Green | Approved/success |
| Red | Rejected/failed |

### Vote Types
- **Simple Majority**: More "for" than "against"
- **Two-Thirds**: ≥67% vote "for"
- **Unanimous**: 100% vote "for", 0% "against"

### Field Types
- `text`, `number`, `date`, `boolean`, `select`, `multiselect`, `document`, `user`

### Common SLAs
- Simple approval: 48 hours
- Complaint review: 120 hours (5 days)
- Investigation: 480 hours (20 days)
- Ethics review: 168 hours (7 days)

---

**You're ready to build workflows!** Start with a simple 3-state approval flow and expand from there.
