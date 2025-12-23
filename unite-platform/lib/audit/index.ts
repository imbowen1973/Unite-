// AuditService with Hash-Chain Logic for Unite Platform DMS Site
import { createHash } from 'crypto'
import { SharePointService } from '@/lib/sharepoint'

interface AuditEvent {
  id: string
  correlationId: string
  action: string
  actor: string // UPN
  timestamp: string
  payload: any
  previousHash: string
  currentHash: string
  siteCollection: string
}

interface AuditChainHead {
  id: string
  headHash: string
  timestamp: string
}

export class AuditService {
  private sharepointService: SharePointService

  constructor(sharepointService: SharePointService) {
    this.sharepointService = sharepointService
  }

  // Serialize the action, actor, timestamp, and payload to canonical JSON
  private getCanonicalString(event: Omit<AuditEvent, 'currentHash'>): string {
    // Sort keys to ensure canonical representation
    const sortedEvent = {
      action: event.action,
      actor: event.actor,
      correlationId: event.correlationId,
      payload: event.payload,
      previousHash: event.previousHash,
      siteCollection: event.siteCollection,
      timestamp: event.timestamp,
    }
    
    return JSON.stringify(sortedEvent, Object.keys(sortedEvent).sort())
  }

  // Compute SHA-256 hash
  private computeHash(data: string): string {
    return createHash('sha256').update(data).digest('hex')
  }

  // Get the current head hash from the audit chain
  async getCurrentHeadHash(): Promise<string> {
    try {
      // Get the head hash from the DMS site AuditChainHead list
      const heads = await this.sharepointService.getListItems('AuditChainHeadListId', 1) // This refers to the DMS site list
      
      if (heads.length > 0) {
        return heads[0].fields.headHash || '0000000000000000000000000000000000000000000000000000000000000000'
      }
      
      // If no head exists, return initial hash
      return '0000000000000000000000000000000000000000000000000000000000000000'
    } catch (error) {
      console.error('Error getting current head hash:', error)
      return '0000000000000000000000000000000000000000000000000000000000000000'
    }
  }

  // Create a new audit event with hash chaining
  async createAuditEvent(
    action: string,
    actor: string, // UPN or user ID
    payload: any,
    correlationId?: string,
    siteCollection: string = 'dms-core' // Default to DMS site
  ): Promise<AuditEvent> {
    // Check if this correlation ID already exists to prevent duplicates
    if (correlationId) {
      const existingEvent = await this.getAuditEventByCorrelationId(correlationId, siteCollection)
      if (existingEvent) {
        // Return the existing event to ensure idempotency
        return existingEvent
      }
    }

    // Get the current head hash
    const previousHash = await this.getCurrentHeadHash()

    // Create the event object without the current hash yet
    const eventWithoutHash: Omit<AuditEvent, 'currentHash'> = {
      id: this.generateId(),
      correlationId: correlationId || this.generateId(),
      action,
      actor,
      timestamp: new Date().toISOString(),
      payload,
      previousHash,
      siteCollection
    }

    // Serialize the canonical representation
    const canonicalString = this.getCanonicalString(eventWithoutHash)
    
    // Compute the new hash
    const currentHash = this.computeHash(canonicalString)

    // Create the complete audit event
    const auditEvent: AuditEvent = {
      ...eventWithoutHash,
      currentHash
    }

    // Store the audit event in SharePoint (in the DMS site)
    await this.storeAuditEvent(auditEvent)

    // Update the audit chain head with the new hash
    await this.updateAuditChainHead(currentHash)

    return auditEvent
  }

  // Store the audit event in SharePoint
  private async storeAuditEvent(event: AuditEvent): Promise<void> {
    await this.sharepointService.addListItem('AuditLogListId', { // This refers to the DMS site list
      Id: event.id,
      CorrelationId: event.correlationId,
      Action: event.action,
      Actor: event.actor,
      Timestamp: event.timestamp,
      Payload: JSON.stringify(event.payload),
      PreviousHash: event.previousHash,
      CurrentHash: event.currentHash,
      SiteCollection: event.siteCollection
    })
  }

  // Update the audit chain head with the latest hash
  private async updateAuditChainHead(headHash: string): Promise<void> {
    // Get existing head
    const heads = await this.sharepointService.getListItems('AuditChainHeadListId', 1) // DMS site list
    
    if (heads.length > 0) {
      // Update existing head
      await this.sharepointService.updateListItem('AuditChainHeadListId', heads[0].id, { // DMS site list
        HeadHash: headHash,
        Timestamp: new Date().toISOString()
      })
    } else {
      // Create initial head
      await this.sharepointService.addListItem('AuditChainHeadListId', { // DMS site list
        Id: this.generateId(),
        HeadHash: headHash,
        Timestamp: new Date().toISOString()
      })
    }
  }

  // Get an audit event by correlation ID to support idempotency
  private async getAuditEventByCorrelationId(correlationId: string, siteCollection: string): Promise<AuditEvent | null> {
    const auditLogs = await this.sharepointService.getListItems('AuditLogListId') // DMS site list
    
    for (const log of auditLogs) {
      if (log.fields.CorrelationId === correlationId) {
        return {
          id: log.fields.Id,
          correlationId: log.fields.CorrelationId,
          action: log.fields.Action,
          actor: log.fields.Actor,
          timestamp: log.fields.Timestamp,
          payload: JSON.parse(log.fields.Payload),
          previousHash: log.fields.PreviousHash,
          currentHash: log.fields.CurrentHash,
          siteCollection: log.fields.SiteCollection
        } as AuditEvent
      }
    }
    
    return null
  }

  // Verify the integrity of the audit chain
  async verifyAuditChain(): Promise<boolean> {
    try {
      // Get all audit events
      const auditEvents = await this.getAllAuditEvents()
      
      // Sort by timestamp to ensure proper order
      auditEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // Start with the initial hash
      let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000'
      
      // For the first event, get the actual previous hash from the chain head
      if (auditEvents.length > 0) {
        const headHash = await this.getCurrentHeadHash()
        // We need to verify from the end of the chain backwards
        return this.verifyChainFromEvents(auditEvents, headHash)
      }
      
      return true // Empty chain is valid
    } catch (error) {
      console.error('Error verifying audit chain:', error)
      return false
    }
  }

  private async verifyChainFromEvents(events: AuditEvent[], headHash: string): Promise<boolean> {
    // Verify each event in the chain
    let currentExpectedHash = headHash
    
    // Go through events in reverse order (most recent first)
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i]
      
      // Check if the current event's hash matches what we expect
      if (event.currentHash !== currentExpectedHash) {
        console.error('Audit chain integrity violation at event:', event.id)
        return false
      }
      
      // Calculate what the previous hash should have been
      const canonicalString = this.getCanonicalString({
        action: event.action,
        actor: event.actor,
        correlationId: event.correlationId,
        payload: event.payload,
        previousHash: event.previousHash,
        siteCollection: event.siteCollection,
        timestamp: event.timestamp,
      })
      
      currentExpectedHash = this.computeHash(canonicalString)
    }
    
    return true
  }

  private async getAllAuditEvents(): Promise<AuditEvent[]> {
    const items = await this.sharepointService.getListItems('AuditLogListId') // DMS site list
    return items.map(item => ({
      id: item.fields.Id,
      correlationId: item.fields.CorrelationId,
      action: item.fields.Action,
      actor: item.fields.Actor,
      timestamp: item.fields.Timestamp,
      payload: JSON.parse(item.fields.Payload),
      previousHash: item.fields.PreviousHash,
      currentHash: item.fields.CurrentHash,
      siteCollection: item.fields.SiteCollection
    } as AuditEvent))
  }

  // Generate a unique ID for audit events
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }
}
