// Enhanced Audit Service for Unite Platform with SharePoint Lists
import { createHash } from 'crypto'
import { SharePointService } from '@/lib/sharepoint'

export interface AuditEvent {
  id: string;
  correlationId: string;
  action: string;
  actor: string; // UPN
  timestamp: string;
  payload: any;
  previousHash: string;
  currentHash: string;
  siteCollection: string;
}

export interface AuditChainHead {
  id: string;
  headHash: string;
  timestamp: string;
}

export interface DocumentReference {
  docStableId: string;
  siteCollection: string;
  libraryName: string;
  itemId: string;
  version: string;
}

export class EnhancedAuditService {
  private sharePointService: SharePointService;

  constructor(sharePointService: SharePointService) {
    this.sharePointService = sharePointService;
  }

  async logEvent(event: Omit<AuditEvent, 'currentHash'>): Promise<AuditEvent> {
    // Check for duplicate using correlation ID
    const existingEvent = await this.getEventByCorrelationId(event.correlationId, event.siteCollection);
    if (existingEvent) {
      return existingEvent;
    }

    // Get current head hash from the DMS site
    const headHash = await this.getCurrentHeadHash();
    
    // Serialize the canonical representation
    const canonicalString = this.getCanonicalString({
      ...event,
      previousHash: headHash
    });
    
    // Compute new hash
    const currentHash = createHash('sha256')
      .update(canonicalString)
      .digest('hex');
    
    // Create complete audit event
    const auditEvent: AuditEvent = {
      ...event,
      previousHash: headHash,
      currentHash
    };

    // Write to SharePoint audit log and update head
    await this.writeToAuditChain(auditEvent);
    
    return auditEvent;
  }

  private getCanonicalString(event: Omit<AuditEvent, 'currentHash'>): string {
    // Sort keys to ensure consistent serialization
    const sortedEvent = {
      action: event.action,
      actor: event.actor,
      correlationId: event.correlationId,
      payload: event.payload,
      previousHash: event.previousHash,
      siteCollection: event.siteCollection,
      timestamp: event.timestamp,
    };
    
    return JSON.stringify(sortedEvent, Object.keys(sortedEvent).sort());
  }

  private async getCurrentHeadHash(): Promise<string> {
    try {
      // Get the head hash from the DMS site AuditChainHead list
      const heads = await this.sharePointService.getListItems('AuditChainHeadListId', 1); // Assuming this maps to the DMS site list
      
      if (heads.length > 0) {
        return heads[0].fields.headHash || '0000000000000000000000000000000000000000000000000000000000000000';
      }
      
      // If no head exists, return initial hash
      return '0000000000000000000000000000000000000000000000000000000000000000';
    } catch (error) {
      console.error('Error getting current head hash:', error);
      return '0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  private async writeToAuditChain(event: AuditEvent): Promise<void> {
    // Write to audit log list in the DMS site
    await this.sharePointService.addListItem('AuditLogListId', {
      Id: event.id,
      CorrelationId: event.correlationId,
      Action: event.action,
      Actor: event.actor,
      Timestamp: event.timestamp,
      Payload: JSON.stringify(event.payload),
      PreviousHash: event.previousHash,
      CurrentHash: event.currentHash,
      SiteCollection: event.siteCollection
    });
    
    // Update head hash in the DMS site
    await this.updateAuditChainHead(event.currentHash);
  }

  private async updateAuditChainHead(headHash: string): Promise<void> {
    // Update the head hash in the DMS site
    // If no head exists yet, create one; otherwise update the existing one
    const heads = await this.sharePointService.getListItems('AuditChainHeadListId', 1);
    
    if (heads.length > 0) {
      // Update existing head
      await this.sharePointService.updateListItem('AuditChainHeadListId', heads[0].id, {
        HeadHash: headHash,
        Timestamp: new Date().toISOString()
      });
    } else {
      // Create initial head
      await this.sharePointService.addListItem('AuditChainHeadListId', {
        Id: this.generateId(),
        HeadHash: headHash,
        Timestamp: new Date().toISOString()
      });
    }
  }

  private async getEventByCorrelationId(correlationId: string, siteCollection: string): Promise<AuditEvent | null> {
    try {
      const items = await this.sharePointService.getListItems('AuditLogListId');
      
      for (const item of items) {
        if (item.fields.CorrelationId === correlationId) {
          return {
            id: item.fields.Id,
            correlationId: item.fields.CorrelationId,
            action: item.fields.Action,
            actor: item.fields.Actor,
            timestamp: item.fields.Timestamp,
            payload: JSON.parse(item.fields.Payload),
            previousHash: item.fields.PreviousHash,
            currentHash: item.fields.CurrentHash,
            siteCollection: item.fields.SiteCollection
          } as AuditEvent;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting event by correlation ID:', error);
      return null;
    }
  }

  // Verify the integrity of the entire audit chain
  async verifyAuditChain(): Promise<boolean> {
    try {
      // Get all audit events
      const auditEvents = await this.getAllAuditEvents();
      
      // Sort by timestamp to ensure proper order
      auditEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Start with the initial hash
      let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000';
      
      // For the first event, get the actual previous hash from the chain head
      if (auditEvents.length > 0) {
        const headHash = await this.getCurrentHeadHash();
        // We need to verify from the end of the chain backwards
        return this.verifyChainFromEvents(auditEvents, headHash);
      }
      
      return true; // Empty chain is valid
    } catch (error) {
      console.error('Error verifying audit chain:', error);
      return false;
    }
  }

  private async verifyChainFromEvents(events: AuditEvent[], headHash: string): Promise<boolean> {
    // Verify each event in the chain
    let currentExpectedHash = headHash;
    
    // Go through events in reverse order (most recent first)
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      
      // Check if the current event's hash matches what we expect
      if (event.currentHash !== currentExpectedHash) {
        console.error('Audit chain integrity violation at event:', event.id);
        return false;
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
      });
      
      currentExpectedHash = createHash('sha256')
        .update(canonicalString)
        .digest('hex');
    }
    
    return true;
  }

  private async getAllAuditEvents(): Promise<AuditEvent[]> {
    const items = await this.sharePointService.getListItems('AuditLogListId');
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
    } as AuditEvent));
  }

  // Generate a unique ID for audit events
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // Create a new site collection for an appeal
  async createAppealSite(appealId: string, title: string, description: string): Promise<string> {
    // This would call the Microsoft Graph API to create a new site collection
    // For now, we'll simulate this by returning a site URL
    const siteUrl = 'https://yourtenant.sharepoint.com/sites/unite-appeal-' + appealId;
    
    // Log the site creation
    await this.logEvent({
      id: this.generateId(),
      correlationId: 'create_appeal_site_' + appealId,
      action: 'appeal.site.created',
      actor: 'system',
      timestamp: new Date().toISOString(),
      payload: {
        appealId,
        siteUrl,
        title,
        description
      },
      previousHash: await this.getCurrentHeadHash(),
      siteCollection: 'dms-core'
    });
    
    return siteUrl;
  }

  // Create document reference in DMS catalogue
  async createDocumentReference(docRef: DocumentReference): Promise<void> {
    // Add the document reference to the DMS catalogue list
    await this.sharePointService.addListItem('DocumentCatalogueListId', {
      DocStableId: docRef.docStableId,
      SiteCollection: docRef.siteCollection,
      LibraryName: docRef.libraryName,
      ItemId: docRef.itemId,
      Version: docRef.version,
      CreatedAt: new Date().toISOString()
    });
    
    // Log the document reference creation
    await this.logEvent({
      id: this.generateId(),
      correlationId: 'create_doc_ref_' + docRef.docStableId,
      action: 'document.reference.created',
      actor: 'system',
      timestamp: new Date().toISOString(),
      payload: docRef,
      previousHash: await this.getCurrentHeadHash(),
      siteCollection: 'dms-core'
    });
  }

  // Get document reference from DMS catalogue
  async getDocumentReference(docStableId: string): Promise<DocumentReference | null> {
    const items = await this.sharePointService.getListItems('DocumentCatalogueListId');
    
    for (const item of items) {
      if (item.fields.DocStableId === docStableId) {
        return {
          docStableId: item.fields.DocStableId,
          siteCollection: item.fields.SiteCollection,
          libraryName: item.fields.LibraryName,
          itemId: item.fields.ItemId,
          version: item.fields.Version
        } as DocumentReference;
      }
    }
    
    return null;
  }
}
