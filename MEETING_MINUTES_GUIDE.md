# Meeting Minutes System Guide

## Overview

The Unite Platform implements a **comprehensive meeting minutes system** that:
- ✅ Stores minutes as SharePoint list items (like agenda items)
- ✅ Links each minute item to its corresponding agenda item
- ✅ Uses AI to extract discussion from meeting transcripts
- ✅ Supports manual editing and updates
- ✅ Handles Any Other Business (AoB) items
- ✅ Manages attendance records
- ✅ Exports to formatted PDF documents
- ✅ Supports approval workflow

## Architecture

### SharePoint Lists Structure

Minutes are stored in **three SharePoint lists**:

#### 1. MeetingMinutes List

Stores the overall minutes document for each meeting.

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Text | Unique identifier |
| `MeetingId` | Text | Foreign key to Meetings list |
| `MeetingTitle` | Text | Meeting title (copied from meeting) |
| `Committee` | Text | Committee name |
| `MeetingDate` | DateTime | Date of meeting |
| `StartTime` | DateTime | Meeting start time |
| `EndTime` | DateTime | Meeting end time |
| `Location` | Text | Meeting location |
| `Attendees` | JSON | Array of AttendanceRecords |
| `Apologies` | JSON | Array of names who sent apologies |
| `Absent` | JSON | Array of names who were absent |
| `MinuteItems` | JSON | Array of MinuteItem IDs |
| `AdditionalNotes` | Text | General notes |
| `NextMeetingDate` | DateTime | Date of next meeting |
| `Status` | Choice | draft, circulated, approved, published |
| `CirculatedAt` | DateTime | When minutes were circulated |
| `CirculatedBy` | Text | Who circulated the minutes |
| `ApprovedAt` | DateTime | When minutes were approved |
| `ApprovedBy` | Text | Who approved the minutes |
| `PdfUrl` | Text | Link to generated PDF |
| `PdfGeneratedAt` | DateTime | When PDF was generated |
| `Version` | Text | Version number (e.g., "1.0", "1.1") |
| `CreatedAt` | DateTime | Creation timestamp |
| `UpdatedAt` | DateTime | Last update timestamp |

#### 2. MinuteItems List

Stores individual minute items, one per agenda item.

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Text | Unique identifier |
| `MeetingId` | Text | Foreign key to Meetings list |
| `AgendaItemId` | Text | Links to corresponding AgendaItem |
| `AgendaTitle` | Text | Agenda item title (copied) |
| `AgendaPurpose` | Text | Agenda item description (copied) |
| `OrderPath` | Text | Matches agenda item orderPath for sorting |
| `Level` | Number | Matches agenda item level |
| `Discussion` | Text | Main discussion text |
| `DiscussionSummary` | Text | AI-generated summary (2-3 sentences) |
| `KeyPoints` | JSON | Array of key discussion points |
| `Decision` | Text | Final decision or outcome |
| `VotingResult` | JSON | Voting results if applicable |
| `Actions` | JSON | Array of MeetingAction IDs |
| `Presenters` | JSON | Who presented this item |
| `Status` | Choice | draft, reviewed, approved |
| `LastEditedBy` | Text | Who last edited |
| `LastEditedAt` | DateTime | When last edited |
| `ApprovedBy` | Text | Who approved |
| `ApprovedAt` | DateTime | When approved |
| `TranscriptSegment` | JSON | AI-extracted transcript info |
| `CreatedAt` | DateTime | Creation timestamp |
| `UpdatedAt` | DateTime | Last update timestamp |

#### 3. Transcripts List

Stores meeting transcripts for AI processing.

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Text | Unique identifier |
| `MeetingId` | Text | Foreign key to Meetings list |
| `RecordingUrl` | Text | Link to Teams/Zoom recording |
| `RecordingDuration` | Number | Duration in seconds |
| `TranscriptText` | Text | Full transcript content |
| `TranscriptFormat` | Choice | plain, vtt, srt, json |
| `Segments` | JSON | Timestamped segments |
| `Speakers` | JSON | Speaker information |
| `UploadedBy` | Text | Who uploaded |
| `UploadedAt` | DateTime | Upload timestamp |
| `ProcessedAt` | DateTime | AI processing completion time |
| `ProcessingStatus` | Choice | pending, processing, completed, failed |
| `ProcessingError` | Text | Error message if failed |
| `ExtractedMinutes` | JSON | AI extraction results |

## Workflow

### 1. Initialize Minutes from Agenda

When the agenda is finalized, minutes are initialized:

```typescript
POST /api/minutes
{
  "action": "initializeFromAgenda",
  "meetingId": "mtg-123"
}

Response:
{
  "success": true,
  "minutesId": "min-456",
  "minuteItems": [
    {
      "id": "mi-001",
      "meetingId": "mtg-123",
      "agendaItemId": "item-001",
      "agendaTitle": "Welcome & Apologies",
      "agendaPurpose": "Opening remarks",
      "orderPath": "1",
      "level": 0,
      "discussion": "", // Empty, to be filled
      "actions": [],
      "status": "draft"
    },
    // ... one for each agenda item (excluding breaks)
  ]
}
```

**What happens:**
1. Creates a `MeetingMinutes` record
2. Creates a `MinuteItem` for each `AgendaItem` (except breaks)
3. Copies agenda structure (orderPath, level) for consistent sorting
4. Initializes empty discussion fields
5. Status set to "draft"

### 2. Upload and Process Transcript (AI Extraction)

Upload a transcript file and let AI extract discussions:

```typescript
// 1. Upload transcript
POST /api/minutes/transcript
Content-Type: multipart/form-data

FormData:
- transcript: [File] (transcript.txt, transcript.vtt, transcript.srt)
- meetingId: "mtg-123"

Response:
{
  "success": true,
  "transcriptId": "trans-789",
  "format": "vtt",
  "segmentCount": 45
}

// 2. Process with AI
POST /api/minutes
{
  "action": "processTranscript",
  "meetingId": "mtg-123",
  "transcriptId": "trans-789"
}

Response:
{
  "success": true,
  "extractedCount": 12,
  "updatedItems": [
    {
      "id": "mi-001",
      "discussion": "The Chair welcomed all attendees and noted apologies from Prof. Smith...",
      "discussionSummary": "Opening remarks with apologies noted.",
      "keyPoints": [
        "Prof. Smith sent apologies",
        "Quorum confirmed"
      ],
      "suggestedActions": [],
      "decision": null,
      "transcriptSegment": {
        "startTime": "00:00:00",
        "endTime": "00:02:30",
        "transcriptText": "Chair: Welcome everyone...",
        "confidenceScore": 92
      }
    }
    // ... for each agenda item
  ]
}
```

**How AI extraction works:**
1. **Upload:** Transcript file is parsed into segments (if VTT/SRT format)
2. **Matching:** AI matches transcript segments to agenda items using:
   - Time boundaries (if agenda has startTime/endTime)
   - Keyword matching (agenda title + description)
3. **Extraction:** For each agenda item, AI extracts:
   - Full discussion narrative (past tense, third person)
   - Summary (2-3 sentences)
   - Key points (bullet list)
   - Suggested actions
   - Decisions made
   - Confidence score (0-100)
4. **Storage:** Results saved to MinuteItem with transcript segment reference

### 3. Manual Editing

Edit discussions manually or refine AI extractions:

```typescript
POST /api/minutes
{
  "action": "updateMinuteItem",
  "minuteItemId": "mi-001",
  "discussion": "Updated discussion text...",
  "keyPoints": [
    "First key point",
    "Second key point"
  ],
  "decision": "Approved unanimously"
}

Response:
{
  "success": true,
  "minuteItem": { ... }
}
```

**UI Features:**
- Inline editing of discussion, key points, decision
- View AI-extracted transcript segment for reference
- Add/remove key points dynamically
- Edit mode with save/cancel

### 4. Add Any Other Business (AoB)

Add items discussed but not on the original agenda:

```typescript
POST /api/minutes
{
  "action": "addAobItem",
  "meetingId": "mtg-123",
  "title": "Office relocation",
  "discussion": "Committee discussed proposed office relocation to Building C...",
  "decision": "Agreed to form a working group to investigate further"
}

Response:
{
  "success": true,
  "minuteItem": {
    "id": "mi-099",
    "agendaItemId": "aob", // Special marker
    "agendaTitle": "Office relocation",
    "agendaPurpose": "Any Other Business",
    "orderPath": "15", // Appended at end
    "level": 0,
    "discussion": "...",
    "decision": "..."
  }
}
```

**AoB Handling:**
- AoB items have `agendaItemId = "aob"` (special marker)
- Automatically appended at end (highest orderPath + 1)
- Same structure as regular minute items
- Can have discussion, decisions, actions

### 5. Update Attendance

Record who attended, sent apologies, or was absent:

```typescript
POST /api/minutes
{
  "action": "updateAttendance",
  "minutesId": "min-456",
  "attendees": [
    {
      "userId": "user-001",
      "displayName": "Dr. Jane Smith",
      "email": "jane.smith@university.ac.uk",
      "role": "Chair",
      "status": "present"
    },
    {
      "userId": "user-002",
      "displayName": "Prof. John Doe",
      "email": "john.doe@university.ac.uk",
      "role": "Member",
      "status": "present",
      "arrivedAt": "2025-01-15T10:15:00Z" // Arrived late
    },
    {
      "userId": "user-003",
      "displayName": "Dr. Emily Brown",
      "email": "emily.brown@university.ac.uk",
      "role": "Member",
      "status": "apologies"
    }
  ],
  "apologies": ["Dr. Emily Brown"],
  "absent": []
}
```

**Attendance Features:**
- Mark as Present, Apologies, Absent
- Record late arrivals (`arrivedAt`)
- Record early departures (`leftAt`)
- Roles: Chair, Secretary, Member, Observer

### 6. Generate PDF

Export minutes to formatted PDF:

```typescript
POST /api/minutes/pdf
{
  "minutesId": "min-456",
  "options": {
    "includeActions": true,
    "includeVotingResults": true,
    "includeTranscriptSegments": false,
    "includeConfidenceScores": false,
    "format": "standard", // or "formal", "compact"
    "letterhead": true,
    "watermark": "DRAFT" // optional
  }
}

Response:
{
  "success": true,
  "pdfUrl": "/api/minutes/pdf/board_meeting_jan_2025.pdf",
  "pdfPath": "/tmp/minutes_board_meeting_jan_2025_1234567890.pdf"
}
```

**PDF Features:**
- Professional formatting with university letterhead
- Attendance section (Present, Apologies, Absent)
- Hierarchical minute items with indentation
- Key points highlighted
- Decisions in green boxes
- Voting results in orange boxes
- Signature blocks for Chair and Secretary
- Document metadata (version, approval status, generation date)
- Optional watermark (e.g., "DRAFT", "CONFIDENTIAL")
- Three formats: standard, formal (Times New Roman), compact

### 7. Approve Minutes

Lock minutes from further edits:

```typescript
POST /api/minutes
{
  "action": "approveMinutes",
  "minutesId": "min-456"
}

Response:
{
  "success": true,
  "minutes": {
    "id": "min-456",
    "status": "approved",
    "approvedBy": "jane.smith@university.ac.uk",
    "approvedAt": "2025-01-20T14:30:00Z"
  }
}
```

**Approval Effects:**
- Status changed from "draft" to "approved"
- All minute items marked as approved
- Editing disabled
- Recorded who approved and when

### 8. Circulate Minutes

Send approved minutes to attendees:

```typescript
POST /api/minutes
{
  "action": "circulateMinutes",
  "minutesId": "min-456"
}

Response:
{
  "success": true,
  "minutes": {
    "status": "circulated",
    "circulatedBy": "secretary@university.ac.uk",
    "circulatedAt": "2025-01-20T15:00:00Z"
  }
}
```

**Circulation:**
- Email sent to all attendees
- Includes PDF attachment
- Status updated to "circulated"
- Recorded who circulated and when

## Example Workflow

### Complete Meeting Minutes Process

```
1. BEFORE MEETING
   - Agenda finalized
   - Meeting pack distributed

2. DURING MEETING
   - Meeting recorded (Teams/Zoom)
   - Notes taken (optional)

3. AFTER MEETING
   Step 1: Initialize Minutes
   → POST /api/minutes { action: "initializeFromAgenda" }
   → Creates MinuteItem for each AgendaItem

   Step 2: Upload Transcript
   → POST /api/minutes/transcript (upload recording transcript)
   → Transcript parsed and stored

   Step 3: AI Extraction
   → POST /api/minutes { action: "processTranscript" }
   → AI extracts discussion for each item
   → Results auto-populate minute items

   Step 4: Manual Review & Edit
   → Secretary reviews AI-extracted discussions
   → Edits/refines as needed
   → Adds AoB items
   → Updates attendance

   Step 5: Generate PDF
   → POST /api/minutes/pdf
   → PDF generated with all content
   → Review and download

   Step 6: Circulate
   → POST /api/minutes { action: "circulateMinutes" }
   → Email sent to attendees for review

   Step 7: Approve
   → Committee reviews minutes
   → POST /api/minutes { action: "approveMinutes" }
   → Minutes locked, approved

   Step 8: Publish
   → Minutes published to DMS
   → Available for reference
```

## Data Model

### Minute Item Example

```json
{
  "id": "mi-004",
  "meetingId": "mtg-123",
  "agendaItemId": "item-004",

  "agendaTitle": "Finance Report",
  "agendaPurpose": "Quarterly financial review",
  "orderPath": "4",
  "level": 0,

  "discussion": "The CFO presented the Q1 financial results, highlighting a 15% increase in revenue compared to Q1 2024. The committee discussed the budget variance analysis, noting that departmental spending was within 2% of projections. Concerns were raised about projected Q2 revenue, given upcoming policy changes. The CFO reassured the committee that contingency plans are in place.",

  "discussionSummary": "Q1 financial results showed strong 15% revenue growth. Budget variance within acceptable limits. Q2 projections discussed with contingency plans confirmed.",

  "keyPoints": [
    "Q1 revenue increased 15% year-over-year",
    "Departmental spending within 2% of budget",
    "Q2 revenue may be affected by policy changes",
    "Contingency plans in place for Q2"
  ],

  "decision": "Q1 financial results approved. CFO to provide updated Q2 forecast at next meeting.",

  "votingResult": null,

  "actions": ["action-012", "action-013"],

  "presenters": ["cfo@university.ac.uk"],

  "status": "approved",
  "lastEditedBy": "secretary@university.ac.uk",
  "lastEditedAt": "2025-01-16T14:30:00Z",
  "approvedBy": "chair@university.ac.uk",
  "approvedAt": "2025-01-20T14:30:00Z",

  "transcriptSegment": {
    "startTime": "00:30:00",
    "endTime": "00:45:00",
    "transcriptText": "[CFO]: I'm pleased to present our Q1 results...\n[Chair]: Thank you. Questions for the CFO?\n[Member 1]: Can you explain the variance in...",
    "confidenceScore": 94
  },

  "createdAt": "2025-01-15T16:00:00Z",
  "updatedAt": "2025-01-16T14:30:00Z"
}
```

## Transcript Formats

### Supported Formats

1. **Plain Text (.txt)**
   - Simple text file
   - No timestamps
   - AI uses keyword matching

2. **WebVTT (.vtt)**
   - Web Video Text Tracks format
   - Includes timestamps
   - Speaker identification optional

   ```
   WEBVTT

   00:00:15.000 --> 00:00:18.000
   Chair: Welcome everyone to the meeting.

   00:00:18.500 --> 00:00:22.000
   Secretary: We have apologies from Prof. Smith.
   ```

3. **SRT (.srt)**
   - SubRip format
   - Includes timestamps
   - Commonly used format

   ```
   1
   00:00:15,000 --> 00:00:18,000
   Chair: Welcome everyone to the meeting.

   2
   00:00:18,500 --> 00:00:22,000
   Secretary: We have apologies from Prof. Smith.
   ```

4. **JSON (.json)**
   - Structured format
   - Teams/Zoom export format
   - Includes speaker info

   ```json
   {
     "segments": [
       {
         "startTime": "00:00:15",
         "endTime": "00:00:18",
         "speaker": "Chair",
         "text": "Welcome everyone to the meeting."
       }
     ]
   }
   ```

## UI Components

### MinutesEditor Component

```tsx
<MinutesEditor
  meetingId="mtg-123"
  minutesId="min-456"
  onSave={() => console.log('Saved')}
  onApprove={() => console.log('Approved')}
  onCirculate={() => console.log('Circulated')}
/>
```

**Features:**
- Initialize from agenda button
- AI extraction with transcript upload
- Inline editing for each minute item
- Expand/collapse items
- Add AoB items
- Manage attendance
- Generate PDF
- Approve/circulate workflows
- Tabs: Minutes, Attendance

**UI States:**
- **Draft:** Full editing enabled
- **Circulated:** View-only, awaiting approval
- **Approved:** Locked, no edits

## Benefits

✅ **Automated Minutes Creation:** AI extracts discussion from transcripts
✅ **Consistent Structure:** Minutes mirror agenda hierarchy
✅ **Efficient Workflow:** Initialize → AI Extract → Review → Approve
✅ **Audit Trail:** Track who edited what and when
✅ **Professional Output:** Formatted PDFs with letterhead
✅ **Flexible Editing:** Manual edits always possible
✅ **AoB Support:** Capture items discussed outside agenda
✅ **Attendance Tracking:** Present, apologies, absent with late arrivals
✅ **Version Control:** Track versions and changes
✅ **Integration:** Links to actions, votes, documents

## Best Practices

### 1. Transcript Quality

- **Use high-quality recordings** - Clear audio improves AI extraction
- **Enable speaker identification** in Teams/Zoom
- **Use VTT/SRT formats** when possible for better timestamp accuracy
- **Review AI extractions** - Always manually verify AI-generated content

### 2. Minutes Structure

- **Keep discussions concise** - Focus on "what was decided" not "what was said"
- **Use key points** for highlighting main topics
- **Record decisions explicitly** - Make outcomes clear
- **Link actions** to responsible parties with due dates

### 3. Workflow Timing

- **Initialize minutes** immediately after meeting ends
- **Upload transcript** within 24 hours (while fresh)
- **Review AI extractions** within 2-3 days
- **Circulate for review** within 1 week
- **Approve** at next meeting (or electronically)

### 4. PDF Generation

- **Use watermarks** for draft versions ("DRAFT", "NOT APPROVED")
- **Remove watermarks** for approved versions
- **Include letterhead** for formal minutes
- **Export final PDF** only after approval

## Migration from Existing Systems

For organizations with existing minute-taking processes:

1. **Import historical minutes** as MinuteItems with manual data entry
2. **Start new process** from next meeting
3. **Train secretaries** on AI extraction workflow
4. **Run parallel systems** for 2-3 meetings during transition
5. **Phase out old system** once comfortable with new workflow

---

**The meeting minutes system is production-ready!** Minutes are stored in SharePoint lists, dynamically populated from agendas, enhanced with AI extraction from transcripts, and exported to professional PDF documents.
