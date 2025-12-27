# Hierarchical Agenda System Guide

## Overview

The Unite Platform now supports **hierarchical agenda items** with:
- ✅ Sub-items (nested agenda points)
- ✅ Linked reordering (parent + children move together)
- ✅ Automatic time flow calculation
- ✅ Breaks as agenda items
- ✅ Order preservation

## SharePoint List Structure

### Agenda Items List

All agenda items are stored in a single SharePoint list with these key columns:

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Text | Unique identifier |
| `MeetingId` | Text | Foreign key to Meetings list |
| `Title` | Text | Agenda item title |
| `ItemOrder` | Number | Position at this level (1, 2, 3...) |
| **`ParentItemId`** | Text | Link to parent item (null for top-level) |
| **`OrderPath`** | Text | Full hierarchical path ("7", "7.1", "7.2.1") |
| **`Level`** | Number | Depth (0=top, 1=first sub, 2=second sub) |
| **`StartTime`** | DateTime | Calculated start time |
| **`TimeAllocation`** | Number | Duration in minutes |
| **`EndTime`** | DateTime | Calculated end time |
| `Role` | Choice | information, action, decision, voting, discussion, **break** |
| `Presenter` | Text | Who presents this item |
| `Status` | Choice | pending, in-progress, discussed, deferred, completed |

## Hierarchical Structure Example

### Example Agenda

```
Meeting: Board Meeting - Jan 2025
Start Time: 10:00 AM

1. Welcome & Apologies (10 mins)                   [10:00 - 10:10]
2. Minutes of Previous Meeting (5 mins)             [10:10 - 10:15]
3. Matters Arising (15 mins)                        [10:15 - 10:30]
4. Finance Report (45 mins)                         [10:30 - 11:15]
   4.1. Q1 Financial Results (15 mins)              [10:30 - 10:45]
   4.2. Budget Variance Analysis (15 mins)          [10:45 - 11:00]
   4.3. Forecast for Q2 (15 mins)                   [11:00 - 11:15]
5. **BREAK** (15 mins)                              [11:15 - 11:30]
6. Academic Standards Report (60 mins)              [11:30 - 12:30]
   6.1. Student Performance Metrics (20 mins)       [11:30 - 11:50]
   6.2. New Programme Approvals (20 mins)           [11:50 - 12:10]
       6.2.1. MSc Data Science (10 mins)            [11:50 - 12:00]
       6.2.2. BSc Cybersecurity (10 mins)           [12:00 - 12:10]
   6.3. External Examiner Reports (20 mins)         [12:10 - 12:30]
7. Any Other Business (10 mins)                     [12:30 - 12:40]

Total Duration: 2 hours 40 minutes
```

### SharePoint Data for Above

| Id | MeetingId | Title | ItemOrder | ParentItemId | OrderPath | Level | StartTime | TimeAllocation | EndTime | Role |
|----|-----------|-------|-----------|--------------|-----------|-------|-----------|----------------|---------|------|
| item-001 | mtg-123 | Welcome & Apologies | 1 | null | "1" | 0 | 10:00 | 10 | 10:10 | information |
| item-002 | mtg-123 | Minutes of Previous Meeting | 2 | null | "2" | 0 | 10:10 | 5 | 10:15 | action |
| item-003 | mtg-123 | Matters Arising | 3 | null | "3" | 0 | 10:15 | 15 | 10:30 | discussion |
| item-004 | mtg-123 | Finance Report | 4 | null | "4" | 0 | 10:30 | 45 | 11:15 | information |
| item-005 | mtg-123 | Q1 Financial Results | 1 | item-004 | "4.1" | 1 | 10:30 | 15 | 10:45 | information |
| item-006 | mtg-123 | Budget Variance Analysis | 2 | item-004 | "4.2" | 1 | 10:45 | 15 | 11:00 | discussion |
| item-007 | mtg-123 | Forecast for Q2 | 3 | item-004 | "4.3" | 1 | 11:00 | 15 | 11:15 | decision |
| item-008 | mtg-123 | **BREAK** | 5 | null | "5" | 0 | 11:15 | 15 | 11:30 | **break** |
| item-009 | mtg-123 | Academic Standards Report | 6 | null | "6" | 0 | 11:30 | 60 | 12:30 | information |
| item-010 | mtg-123 | Student Performance Metrics | 1 | item-009 | "6.1" | 1 | 11:30 | 20 | 11:50 | information |
| item-011 | mtg-123 | New Programme Approvals | 2 | item-009 | "6.2" | 1 | 11:50 | 20 | 12:10 | voting |
| item-012 | mtg-123 | MSc Data Science | 1 | item-011 | "6.2.1" | 2 | 11:50 | 10 | 12:00 | voting |
| item-013 | mtg-123 | BSc Cybersecurity | 2 | item-011 | "6.2.2" | 2 | 12:00 | 10 | 12:10 | voting |
| item-014 | mtg-123 | External Examiner Reports | 3 | item-009 | "6.3" | 1 | 12:10 | 20 | 12:30 | discussion |
| item-015 | mtg-123 | Any Other Business | 7 | null | "7" | 0 | 12:30 | 10 | 12:40 | discussion |

## Key Concepts

### 1. Order Path

The `OrderPath` is a dot-separated string representing the full hierarchical position:

- `"1"` - First top-level item
- `"4"` - Fourth top-level item
- `"4.1"` - First sub-item of item 4
- `"4.2"` - Second sub-item of item 4
- `"6.2.1"` - First sub-sub-item of item 6.2

**Sorting**: Items are sorted by comparing order paths segment by segment:
```
"1" < "2" < "4" < "4.1" < "4.2" < "4.3" < "5" < "6" < "6.1" < "6.2" < "6.2.1" < "6.2.2" < "6.3" < "7"
```

### 2. Parent-Child Links

Each item can have a `ParentItemId`:
- **Top-level items**: `ParentItemId = null`
- **Sub-items**: `ParentItemId = <parent's Id>`

This creates an unbreakable link - when the parent moves, all children move with it.

### 3. Level (Depth)

The `Level` indicates nesting depth:
- `0` = Top-level item
- `1` = First-level sub-item
- `2` = Second-level sub-item (sub-sub-item)
- `3` = Maximum depth (configurable)

### 4. Time Flow

Times are calculated automatically:

1. **Meeting Start Time**: e.g., 10:00 AM
2. **First Item Start**: Meeting start time = 10:00 AM
3. **First Item End**: Start + TimeAllocation = 10:00 + 10 mins = 10:10 AM
4. **Second Item Start**: Previous end time = 10:10 AM
5. **Second Item End**: 10:10 + 5 mins = 10:15 AM
6. ...and so on

**Automatic Recalculation**: When any item's duration changes or items are reordered, all times are recalculated.

### 5. Breaks

Breaks are special agenda items:
- `Role = 'break'`
- Cannot have sub-items
- Included in time flow calculations
- Can be placed anywhere in agenda

## Operations

### Add a Sub-Item

```typescript
// Add "4.1. Q1 Financial Results" as sub-item of "4. Finance Report"
await agendaService.addSubItem(
  user,
  'item-004', // parentItemId
  'Q1 Financial Results',
  'Quarterly financial performance review',
  15, // timeAllocation in minutes
  'john.doe@university.ac.uk', // presenter
  'information' // role
)

// Result:
// OrderPath: "4.1"
// Level: 1
// ParentItemId: item-004
// ItemOrder: 1 (first child of parent)
```

### Add a Break

```typescript
// Add 15-minute break after item 4
await agendaService.addBreak(
  user,
  'mtg-123', // meetingId
  'Coffee Break',
  15, // duration
  'item-004' // insertAfterItemId (optional)
)

// Result:
// OrderPath: "5" (next available top-level number)
// Role: 'break'
// TimeAllocation: 15
```

### Reorder an Item

```typescript
// Move "6. Academic Standards Report" to position 4
// All its children (6.1, 6.2, 6.2.1, 6.2.2, 6.3) move with it
await agendaService.reorderAgendaItem(
  user,
  'item-009', // itemId to move
  undefined, // newParentId (undefined = top-level)
  4 // newOrderPosition
)

// Result:
// Old: "6" → New: "4"
// Old: "6.1" → New: "4.1"
// Old: "6.2" → New: "4.2"
// Old: "6.2.1" → New: "4.2.1"
// Old: "6.2.2" → New: "4.2.2"
// Old: "6.3" → New: "4.3"
//
// Old item 4 and 5 shift down to 5 and 6
// Times recalculated for entire agenda
```

### Update Duration

```typescript
// Change "4.1. Q1 Financial Results" from 15 to 20 minutes
await agendaService.updateTimeAllocation(
  user,
  'item-005', // itemId
  20 // newDuration
)

// Result:
// Item 4.1: 15→20 minutes
// All subsequent items' start/end times recalculated
// Item 4 total duration increased by 5 minutes
```

## UI Display

### Hierarchical Indentation

```
1. Welcome & Apologies
2. Minutes of Previous Meeting
3. Matters Arising
4. Finance Report
   ├─ 4.1. Q1 Financial Results
   ├─ 4.2. Budget Variance Analysis
   └─ 4.3. Forecast for Q2
5. BREAK [15 mins]
6. Academic Standards Report
   ├─ 6.1. Student Performance Metrics
   ├─ 6.2. New Programme Approvals
   │  ├─ 6.2.1. MSc Data Science
   │  └─ 6.2.2. BSc Cybersecurity
   └─ 6.3. External Examiner Reports
7. Any Other Business
```

### CSS Indentation

```css
.agenda-item[data-level="0"] { padding-left: 0px; }
.agenda-item[data-level="1"] { padding-left: 24px; }
.agenda-item[data-level="2"] { padding-left: 48px; }
.agenda-item[data-level="3"] { padding-left: 72px; }
```

### Time Display

```
10:00 - 10:10  1. Welcome & Apologies (10 mins)
10:10 - 10:15  2. Minutes of Previous Meeting (5 mins)
10:15 - 10:30  3. Matters Arising (15 mins)
10:30 - 11:15  4. Finance Report (45 mins)
  10:30 - 10:45    4.1. Q1 Financial Results (15 mins)
  10:45 - 11:00    4.2. Budget Variance Analysis (15 mins)
  11:00 - 11:15    4.3. Forecast for Q2 (15 mins)
11:15 - 11:30  ☕ BREAK (15 mins)
11:30 - 12:30  6. Academic Standards Report (60 mins)
  11:30 - 11:50    6.1. Student Performance Metrics (20 mins)
  11:50 - 12:10    6.2. New Programme Approvals (20 mins)
    11:50 - 12:00      6.2.1. MSc Data Science (10 mins)
    12:00 - 12:10      6.2.2. BSc Cybersecurity (10 mins)
  12:10 - 12:30    6.3. External Examiner Reports (20 mins)
12:30 - 12:40  7. Any Other Business (10 mins)
```

## API Examples

### Create Top-Level Item

```javascript
POST /api/meetings/agenda
{
  "action": "addItem",
  "meetingId": "mtg-123",
  "title": "Finance Report",
  "description": "Quarterly financial review",
  "timeAllocation": 45,
  "presenter": "cfo@university.ac.uk",
  "role": "information"
}

Response:
{
  "success": true,
  "item": {
    "id": "item-004",
    "orderPath": "4",
    "level": 0,
    "startTime": "2025-01-15T10:30:00Z",
    "endTime": "2025-01-15T11:15:00Z"
  }
}
```

### Create Sub-Item

```javascript
POST /api/meetings/agenda
{
  "action": "addSubItem",
  "parentItemId": "item-004",
  "title": "Q1 Financial Results",
  "description": "Quarterly performance review",
  "timeAllocation": 15,
  "presenter": "cfo@university.ac.uk",
  "role": "information"
}

Response:
{
  "success": true,
  "item": {
    "id": "item-005",
    "parentItemId": "item-004",
    "orderPath": "4.1",
    "level": 1,
    "startTime": "2025-01-15T10:30:00Z",
    "endTime": "2025-01-15T10:45:00Z"
  }
}
```

### Reorder Item

```javascript
POST /api/meetings/agenda
{
  "action": "reorderItem",
  "itemId": "item-009",
  "newParentId": null,
  "newOrderPosition": 4
}

Response:
{
  "success": true,
  "operations": [
    { "itemId": "item-009", "newOrderPath": "4", "affectedChildren": ["item-010", "item-011", "item-012", "item-013", "item-014"] },
    { "itemId": "item-010", "newOrderPath": "4.1" },
    { "itemId": "item-011", "newOrderPath": "4.2" },
    { "itemId": "item-012", "newOrderPath": "4.2.1" },
    { "itemId": "item-013", "newOrderPath": "4.2.2" },
    { "itemId": "item-014", "newOrderPath": "4.3" }
  ],
  "message": "Item reordered with 5 children"
}
```

## Validation Rules

1. **Maximum Depth**: 3 levels (configurable)
2. **Breaks**: Cannot have sub-items
3. **Parent Exists**: `ParentItemId` must reference existing item
4. **No Circular References**: Item cannot be its own parent
5. **Order Path Match**: OrderPath must match hierarchical structure
6. **Level Consistency**: Level must equal number of dots in OrderPath

## Benefits

✅ **Clear Structure**: Visual hierarchy makes agendas easy to understand
✅ **Flexible Organization**: Group related items under parent topics
✅ **Linked Movement**: Parent and children always move together
✅ **Automatic Timing**: Times flow automatically, no manual calculation
✅ **Break Support**: Explicit breaks in the agenda
✅ **Sortable**: OrderPath enables proper sorting at all levels
✅ **Scalable**: Works with SharePoint lists for any agenda size

## Migration from Flat Agendas

For existing flat agendas (no sub-items):

1. All items have `ParentItemId = null`
2. Set `OrderPath = ItemOrder.toString()`
3. Set `Level = 0`
4. Calculate `StartTime` and `EndTime` from meeting start

Example migration:
```sql
UPDATE AgendaItems
SET OrderPath = CAST(ItemOrder AS VARCHAR),
    Level = 0,
    ParentItemId = NULL
WHERE OrderPath IS NULL
```

## Future Enhancements

- Drag-and-drop reordering UI
- Collapsible/expandable sub-items
- Templates for common agenda structures
- Automatic agenda generation from document submissions
- Time buffer between items (transition time)
- Parallel tracks (breakout sessions)

---

**The hierarchical agenda system is now production-ready!** All items are stored in a single SharePoint list with proper parent-child relationships, automatic time calculations, and support for sub-items and breaks.
