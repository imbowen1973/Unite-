# Strategic Planning & Tracking System Guide

## Overview

The Unite Platform implements a **Strategic Planning & Tracking System** that ensures organizational strategies aren't "lost in the void" by:
- ✅ Storing 5-year (or custom timeframe) strategic plans
- ✅ Breaking strategies into measurable strategic items
- ✅ Linking meeting activities (agenda items, minutes, decisions) to strategy items
- ✅ Tracking contribution types (initiate, support, deliver-towards, finalise, etc.)
- ✅ Displaying strategy progress on the home page dashboard
- ✅ Reporting on achievements and outcomes after 5 years
- ✅ Ensuring every strategic objective has visible activity

## Problem Statement

**The Challenge:** Organizations create 5-year strategic plans that typically:
- Live in a document somewhere
- Are rarely referenced in day-to-day operations
- Have no visibility into actual progress
- Cannot demonstrate what was actually achieved vs. planned
- Fail to connect strategic objectives to operational activities

**The Solution:** The Unite Platform makes strategy **visible, actionable, and measurable** by:
1. Displaying strategy items on the dashboard (constant visibility)
2. Linking meeting agenda/minutes to strategy items (operational connection)
3. Tracking all activities contributing to each objective (progress evidence)
4. Reporting on outcomes and achievements (accountability)

## Architecture

### SharePoint Lists Structure

#### 1. Strategies List

Stores organizational strategies (e.g., "University Strategy 2025-2030").

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Text | Unique identifier |
| `Title` | Text | Strategy name (e.g., "University Strategy 2025-2030") |
| `Description` | Text | Strategy overview |
| `Vision` | Text | Long-term vision statement |
| `StartYear` | Number | Start year (e.g., 2025) |
| `EndYear` | Number | End year (e.g., 2030) |
| `Themes` | JSON | Strategic themes/pillars |
| `Items` | JSON | Array of StrategyItem IDs |
| `Status` | Choice | draft, active, under-review, completed, archived |
| `IsCurrentStrategy` | Boolean | Is this the active strategy? |
| `DocumentId` | Text | Link to strategy document in DMS |
| `DocStableId` | Text | Stable reference to document |
| `CreatedAt` | DateTime | Creation timestamp |
| `CreatedBy` | Text | Creator UPN |
| `UpdatedAt` | DateTime | Last update timestamp |
| `UpdatedBy` | Text | Last editor UPN |
| `ApprovedAt` | DateTime | Approval timestamp |
| `ApprovedBy` | Text | Approver UPN |

#### 2. StrategyItems List

Stores individual strategic objectives.

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Text | Unique identifier |
| `StrategyId` | Text | Foreign key to Strategies list |
| `Title` | Text | Objective title |
| `Description` | Text | Objective description |
| `OrderNumber` | Number | Display order (1, 2, 3...) |
| `Theme` | Text | Strategic theme (e.g., "Student Experience") |
| `Priority` | Choice | high, medium, low |
| `Owner` | Text | Responsible person/department |
| `TargetOutcome` | Text | What success looks like |
| `KeyMetrics` | JSON | Measurable indicators |
| `Milestones` | JSON | Key milestones |
| `StartDate` | DateTime | When work should begin |
| `TargetCompletionDate` | DateTime | Target completion |
| `ActualCompletionDate` | DateTime | Actual completion |
| `Status` | Choice | not-started, in-progress, on-track, at-risk, delayed, completed, cancelled |
| `ProgressPercentage` | Number | 0-100 |
| `LinkedActivities` | JSON | Array of LinkedActivity objects |
| `CreatedAt` | DateTime | Creation timestamp |
| `CreatedBy` | Text | Creator UPN |
| `UpdatedAt` | DateTime | Last update timestamp |
| `UpdatedBy` | Text | Last editor UPN |

#### 3. LinkedActivities List

Stores connections between strategy items and meeting activities.

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Text | Unique identifier |
| `StrategyItemId` | Text | Links to StrategyItem |
| `ActivityType` | Choice | agenda-item, minute-item, action, decision |
| `ActivityId` | Text | ID of the linked activity |
| `MeetingId` | Text | Meeting where activity occurred |
| `MeetingTitle` | Text | Meeting title |
| `MeetingDate` | DateTime | Meeting date |
| `Committee` | Text | Committee name |
| `ItemTitle` | Text | Agenda/minute item title |
| `ContributionType` | Choice | initiate, support, related-to, deliver-towards, review, monitor, finalise, report |
| `ContributionDescription` | Text | How this activity contributes |
| `Outcomes` | Text | What was achieved |
| `LinkedAt` | DateTime | When linked |
| `LinkedBy` | Text | Who created the link |

## Contribution Types

When linking a meeting activity to a strategy item, specify how it contributes:

| Type | Description | Example |
|------|-------------|---------|
| **initiate** | Starts work on this strategy item | "Committee approved project to begin work on improving student satisfaction" |
| **support** | Supports delivery of this strategy | "Discussed budget allocation to support international partnerships" |
| **related-to** | Related discussion or consideration | "Noted potential impact on research excellence strategy" |
| **deliver-towards** | Makes measurable progress toward delivery | "Approved new BSc programme, advancing academic portfolio diversification" |
| **review** | Reviews progress on this strategy | "Quarterly review of student experience metrics" |
| **monitor** | Monitors implementation | "Received update on facilities improvement project timeline" |
| **finalise** | Completes or finalizes this strategy item | "Approved final research excellence framework, objective completed" |
| **report** | Reports on outcomes | "End-of-year report on sustainability initiatives delivered" |

## Workflow

### 1. Create a Strategy

Create the overarching strategic plan:

```typescript
POST /api/strategy
{
  "action": "createStrategy",
  "title": "University Strategy 2025-2030",
  "description": "Five-year strategic plan focusing on excellence, inclusion, and sustainability",
  "vision": "To be a world-leading institution recognized for transformative education and research",
  "startYear": 2025,
  "endYear": 2030,
  "themes": [
    "Student Experience",
    "Research Excellence",
    "Global Partnerships",
    "Sustainability"
  ]
}

Response:
{
  "success": true,
  "strategy": {
    "id": "strat-001",
    "title": "University Strategy 2025-2030",
    "startYear": 2025,
    "endYear": 2030,
    "status": "draft",
    "isCurrentStrategy": false,
    ...
  }
}
```

### 2. Create Strategy Items

Break the strategy into measurable objectives:

```typescript
POST /api/strategy
{
  "action": "createStrategyItem",
  "strategyId": "strat-001",
  "title": "Increase student satisfaction to 90%",
  "description": "Improve overall student satisfaction scores through enhanced support services, facilities, and academic delivery",
  "theme": "Student Experience",
  "priority": "high",
  "owner": "Deputy Vice-Chancellor (Education)",
  "targetOutcome": "Achieve 90% overall student satisfaction score in National Student Survey",
  "keyMetrics": [
    {
      "id": "metric-001",
      "name": "NSS Overall Satisfaction",
      "unit": "%",
      "baseline": 82,
      "target": 90,
      "measurementFrequency": "annually"
    }
  ],
  "milestones": [
    {
      "id": "milestone-001",
      "title": "Complete student support services review",
      "targetDate": "2025-12-31",
      "status": "pending"
    },
    {
      "id": "milestone-002",
      "title": "Implement new academic delivery model",
      "targetDate": "2026-09-01",
      "status": "pending"
    }
  ],
  "startDate": "2025-01-01",
  "targetCompletionDate": "2030-12-31"
}
```

### 3. Link Agenda Items to Strategy

When creating or editing agenda items, link them to strategy items:

```typescript
// In agenda item creation/editing
{
  "title": "Student Support Services Review",
  "description": "Review current student support services and identify improvements",
  ...
  "strategyLinks": [
    {
      "strategyItemId": "si-001",
      "contributionType": "initiate",
      "contributionDescription": "Launching comprehensive review of student support services as first step toward improving satisfaction"
    }
  ]
}
```

**Backend automatically creates LinkedActivity:**
```typescript
POST /api/strategy
{
  "action": "linkActivity",
  "strategyItemId": "si-001",
  "activityType": "agenda-item",
  "activityId": "item-123",
  "contributionType": "initiate",
  "meetingContext": {
    "meetingId": "mtg-456",
    "meetingTitle": "Education Committee Meeting",
    "meetingDate": "2025-02-15",
    "committee": "Education Committee",
    "itemTitle": "Student Support Services Review"
  },
  "contributionDescription": "Launching comprehensive review..."
}
```

### 4. View Strategy Dashboard

Home page displays the current strategy with all items:

```
GET /api/strategy/current

Response:
{
  "success": true,
  "strategy": {
    "id": "strat-001",
    "title": "University Strategy 2025-2030",
    "startYear": 2025,
    "endYear": 2030,
    "isCurrentStrategy": true,
    ...
  }
}

GET /api/strategy/strat-001/cards

Response:
{
  "success": true,
  "cards": [
    {
      "item": {
        "id": "si-001",
        "title": "Increase student satisfaction to 90%",
        "progressPercentage": 35,
        "status": "in-progress",
        ...
      },
      "activityCount": 12,
      "lastActivityDate": "2025-11-20",
      "progressTrend": "improving",
      "statusColor": "#2196f3"
    },
    ...
  ]
}
```

### 5. Click into Strategy Item

View all linked activities and progress:

```
GET /api/strategy/strat-001/item/si-001

Response:
{
  "success": true,
  "item": {
    "id": "si-001",
    "title": "Increase student satisfaction to 90%",
    "progressPercentage": 35,
    "linkedActivities": [
      {
        "id": "la-001",
        "activityType": "agenda-item",
        "meetingTitle": "Education Committee Meeting",
        "meetingDate": "2025-02-15",
        "itemTitle": "Student Support Services Review",
        "contributionType": "initiate",
        "contributionDescription": "Launching comprehensive review...",
        "outcomes": "Committee approved review scope and timeline"
      },
      {
        "id": "la-002",
        "activityType": "minute-item",
        "meetingTitle": "Board Meeting",
        "meetingDate": "2025-05-10",
        "itemTitle": "Student Experience Update",
        "contributionType": "deliver-towards",
        "outcomes": "Board approved £2M investment in student facilities"
      },
      ...
    ],
    ...
  }
}
```

## Dashboard Display

### Strategy Header

Shows overall strategy with key metrics:
- Title and timeframe (2025-2030)
- Vision statement
- Days remaining
- Completed items / Total items
- In progress count
- At risk count
- Total linked activities
- On track indicator

### Strategy Item Cards

Grid of cards showing each strategic objective:
- Item number and theme badge
- Title and description
- Progress bar (0-100%)
- Status indicator (color-coded dot)
- Activity count
- Owner
- Priority
- Trend indicator (improving/stable/declining)
- Target completion date
- Last activity date
- Click to view details

### Recent Activities

List of recent strategy-related activities:
- Activity type badge (initiate, support, deliver-towards, etc.)
- Committee name
- Item title
- Meeting title and date
- Outcomes achieved

### Upcoming Milestones

List of upcoming milestones across all strategy items:
- Milestone title
- Target date
- Days until due
- Associated strategy item

## Benefits

✅ **Constant Visibility**: Strategy always visible on home page dashboard
✅ **Operational Connection**: Meeting activities directly linked to strategic objectives
✅ **Progress Evidence**: Every activity contributing to strategy is recorded
✅ **Accountability**: Clear ownership and measurable outcomes
✅ **Historical Record**: After 5 years, complete record of what was achieved
✅ **Engagement**: Committees see how their work contributes to strategy
✅ **No Lost Strategies**: Strategy integrated into daily operations, not filed away

## Reporting After 5 Years

At the end of the strategy period (e.g., 2030), the system provides:

### Strategy Completion Report

- Total strategy items: 50
- Completed: 42 (84%)
- Partially completed: 6 (12%)
- Not started: 2 (4%)
- Total activities linked: 487
- Meetings contributing: 123

### Activity Breakdown

- Initiated: 50 activities
- Supported: 132 activities
- Delivered towards: 198 activities
- Finalized: 42 activities
- Reviews: 45 activities
- Reports: 20 activities

### Evidence of Achievement

For each strategy item:
- All meeting discussions related to it
- Decisions made
- Actions taken
- Milestones reached
- Outcomes achieved
- Metric improvements

## Best Practices

### 1. Link Strategically

**Do:**
- Link agenda items that genuinely contribute to strategy
- Use specific contribution types accurately
- Add outcome descriptions to show achievements
- Review strategy links when preparing agendas

**Don't:**
- Link every agenda item to strategy (only relevant ones)
- Use generic contribution descriptions
- Forget to record outcomes in minutes

### 2. Update Progress Regularly

- Review strategy item progress monthly
- Update progress percentages based on milestones
- Mark items as "at-risk" if falling behind
- Celebrate completed items

### 3. Engage Committees

- Include strategy dashboard in committee packs
- Show committees how their work contributes
- Recognize significant contributions
- Request strategy updates in annual reports

### 4. Use Themes Effectively

Group strategy items by themes:
- Student Experience (15 items)
- Research Excellence (12 items)
- Global Partnerships (8 items)
- Sustainability (10 items)

Filter dashboard by theme to focus efforts.

## Example Strategy

### University Strategy 2025-2030

**Vision:** "To be a world-leading institution recognized for transformative education and research"

**Themes:**
1. Student Experience
2. Research Excellence
3. Global Partnerships
4. Sustainability

**Strategic Items (Examples):**

1. **Increase student satisfaction to 90%** [High Priority]
   - Theme: Student Experience
   - Owner: Deputy Vice-Chancellor (Education)
   - Metrics: NSS Overall Satisfaction 82% → 90%
   - Progress: 35% (15 activities linked)

2. **Double research income to £100M/year** [High Priority]
   - Theme: Research Excellence
   - Owner: Deputy Vice-Chancellor (Research)
   - Metrics: Research Income £50M → £100M
   - Progress: 42% (22 activities linked)

3. **Establish 20 new international partnerships** [Medium Priority]
   - Theme: Global Partnerships
   - Owner: Pro Vice-Chancellor (International)
   - Metrics: Partnership count 8 → 20
   - Progress: 60% (18 activities linked)

4. **Achieve net-zero carbon emissions** [High Priority]
   - Theme: Sustainability
   - Owner: Director of Estates
   - Metrics: Carbon emissions 5,000 tonnes → 0
   - Progress: 28% (12 activities linked)

---

**The strategy tracking system ensures that organizational strategies drive operational activities, provide accountability, and demonstrate tangible outcomes over the 5-year period!**
