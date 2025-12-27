// Meeting Template Types for Unite Platform
// Enables reusable meeting agendas with standing items

export interface MeetingTemplateItem {
  id: string // Unique ID within template
  title: string
  description: string
  itemOrder: number
  parentItemId?: string // For hierarchical items
  orderPath: string // e.g., "1", "3.2", "4.1.1"
  level: number
  timeAllocation: number // Default duration in minutes
  role: 'information' | 'action' | 'decision' | 'voting' | 'discussion' | 'break'
  presenter?: string // Default presenter (can be role name or email)
  voteRequired: 'none' | 'approval' | 'opinion'
  voteType?: 'simple-majority' | 'super-majority' | 'unanimous'
  supportingDocumentTypes?: string[] // Expected document types (e.g., ["financial-report", "budget"])
  isStandingItem: boolean // Always appears in this position
  isOptional: boolean // Can be removed when creating meeting
  notes?: string // Instructions for this item
}

export interface MeetingTemplate {
  id: string
  name: string // e.g., "Autumn Board Meeting", "Monthly Academic Committee"
  description: string
  committee: string // Which committee uses this template
  category: 'board' | 'committee' | 'working-group' | 'ad-hoc'

  // Template items (stored as JSON)
  items: MeetingTemplateItem[]

  // Default settings
  defaultDuration: number // Total meeting duration in minutes
  defaultStartTime?: string // e.g., "14:00" for 2pm starts
  defaultLocation?: string
  defaultAttendees?: string[] // User emails or role names

  // Metadata
  isActive: boolean
  version: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  usageCount: number // How many meetings created from this template
  lastUsedAt?: string
}

export interface MeetingFromTemplate {
  templateId: string
  templateName: string
  meetingId: string
  customizations: {
    itemsAdded: number
    itemsRemoved: number
    itemsModified: number
  }
  createdAt: string
}

export interface TemplateUsageStats {
  templateId: string
  totalMeetings: number
  avgCustomizations: number
  mostCommonlyRemoved: string[] // Item titles
  mostCommonlyAdded: string[] // Item types
  avgDuration: number
}

// For the template builder UI
export interface TemplateBuilderState {
  templateId: string | null
  name: string
  description: string
  committee: string
  category: string
  items: MeetingTemplateItem[]
  defaultDuration: number
  isActive: boolean
}

// For creating meetings from templates
export interface CreateMeetingFromTemplateRequest {
  templateId: string
  title: string
  scheduledDate: string
  startTime?: string
  customItems?: {
    remove?: string[] // Item IDs to remove
    modify?: { itemId: string; changes: Partial<MeetingTemplateItem> }[]
    add?: Partial<MeetingTemplateItem>[]
  }
  attendees?: string[]
}
