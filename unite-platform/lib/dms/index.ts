// DMS (Document Management System) Service for Unite Platform
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { DocumentMetadata } from '@/lib/workflow'
import { kv } from '@vercel/kv'
import { randomUUID } from 'crypto'

export interface DocumentCatalogueEntry {
  docStableId: string
  siteCollection: string
  libraryName: string
  itemId: string
  version: string
  title: string
  state: string
  createdAt: string
  updatedAt: string
}

export interface SiteLibraryConfig {
  siteCollection: string
  libraryName: string
  purpose: string
  allowedAccessLevels: string[]
  retentionPeriod: number // in days
}

export class DMSService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  // Register a document in the DMS catalogue
  async registerDocument(
    docStableId: string,
    siteCollection: string,
    libraryName: string,
    itemId: string,
    title: string,
    state: string,
    version: string = '1.0'
  ): Promise<DocumentCatalogueEntry> {
    const catalogueEntry: DocumentCatalogueEntry = {
      docStableId,
      siteCollection,
      libraryName,
      itemId,
      version,
      title,
      state,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add to the DMS catalogue list
    await this.sharepointService.addListItem('DocumentCatalogueListId', {
      DocStableId: catalogueEntry.docStableId,
      SiteCollection: catalogueEntry.siteCollection,
      LibraryName: catalogueEntry.libraryName,
      ItemId: catalogueEntry.itemId,
      Version: catalogueEntry.version,
      Title: catalogueEntry.title,
      State: catalogueEntry.state,
      CreatedAt: catalogueEntry.createdAt,
      UpdatedAt: catalogueEntry.updatedAt
    })

    // Log the registration
    await this.auditService.createAuditEvent(
      'document.registered',
      'system',
      {
        docStableId,
        siteCollection,
        libraryName,
        itemId,
        title
      },
      'register_doc_' + docStableId,
      'dms-core'
    )

    return catalogueEntry
  }

  // Get document location from catalogue
  async getDocumentLocation(docStableId: string): Promise<DocumentCatalogueEntry | null> {
    const catalogueItems = await this.sharepointService.getListItems('DocumentCatalogueListId')
    
    for (const item of catalogueItems) {
      if (item.fields.DocStableId === docStableId) {
        return {
          docStableId: item.fields.DocStableId,
          siteCollection: item.fields.SiteCollection,
          libraryName: item.fields.LibraryName,
          itemId: item.fields.ItemId,
          version: item.fields.Version,
          title: item.fields.Title,
          state: item.fields.State,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        } as DocumentCatalogueEntry
      }
    }
    
    return null
  }

  // Update document state in the catalogue (with race condition protection)
  async updateDocumentState(docStableId: string, newState: string, userUpn: string): Promise<DocumentCatalogueEntry | null> {
    // Implement optimistic locking to prevent race conditions
    const lockKey = `dms_update_lock:${docStableId}`
    const maxRetries = 5
    let retries = 0

    while (retries < maxRetries) {
      try {
        // Try to acquire lock with 10 second TTL
        const lockId = randomUUID()
        const lockAcquired = await kv.set(lockKey, lockId, {
          ex: 10,
          nx: true, // Only set if not exists
        })

        if (!lockAcquired) {
          // Lock is held by another process, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)))
          retries++
          continue
        }

        try {
          // Lock acquired, proceed with state update
          const catalogueEntry = await this.getDocumentLocation(docStableId)
          if (!catalogueEntry) {
            return null
          }

          // Update the catalogue entry
          catalogueEntry.state = newState
          catalogueEntry.updatedAt = new Date().toISOString()

          // Find the item in SharePoint and update it
          const catalogueItems = await this.sharepointService.getListItems('DocumentCatalogueListId')
          let itemIdToUpdate: string | null = null

          for (const item of catalogueItems) {
            if (item.fields.DocStableId === docStableId) {
              itemIdToUpdate = item.id
              break
            }
          }

          if (itemIdToUpdate) {
            await this.sharepointService.updateListItem('DocumentCatalogueListId', itemIdToUpdate, {
              State: newState,
              UpdatedAt: catalogueEntry.updatedAt
            })
          }

          // Log the state change
          await this.auditService.createAuditEvent(
            'document.state.updated',
            userUpn,
            {
              docStableId,
              previousState: catalogueEntry.state,
              newState,
              updatedBy: userUpn
            },
            'update_state_' + docStableId,
            'dms-core'
          )

          return catalogueEntry
        } finally {
          // Always release the lock
          const currentLock = await kv.get(lockKey)
          if (currentLock === lockId) {
            await kv.del(lockKey)
          }
        }
      } catch (error) {
        console.error('Error updating document state:', error)
        retries++
        if (retries >= maxRetries) {
          throw new Error('Failed to update document state after maximum retries')
        }
      }
    }

    throw new Error('Failed to acquire lock for document state update')
  }

  // Create a new site library for specific purposes (e.g., appeals)
  async createSiteLibrary(config: SiteLibraryConfig): Promise<string> {
    // This would use Microsoft Graph API to create a new site collection
    // For now, we'll just return the site URL
    const siteUrl = 'https://yourtenant.sharepoint.com/sites/' + config.siteCollection
    
    // Log the site library creation
    await this.auditService.createAuditEvent(
      'site.library.created',
      'system',
      {
        siteCollection: config.siteCollection,
        libraryName: config.libraryName,
        purpose: config.purpose,
        allowedAccessLevels: config.allowedAccessLevels,
        retentionPeriod: config.retentionPeriod
      },
      'create_site_lib_' + config.siteCollection,
      'dms-core'
    )

    return siteUrl
  }

  // Create a new appeal site with isolated document library
  async createAppealSite(appealId: string, title: string, description: string): Promise<string> {
    // Create a new site collection for the appeal
    const siteUrl = 'https://yourtenant.sharepoint.com/sites/unite-appeal-' + appealId
    
    // Register the site in the DMS system
    await this.auditService.createAuditEvent(
      'appeal.site.created',
      'system',
      {
        appealId,
        siteUrl,
        title,
        description
      },
      'create_appeal_site_' + appealId,
      'dms-core'
    )

    return siteUrl
  }

  // Archive an appeal site based on retention rules
  async archiveAppealSite(appealId: string, userUpn: string): Promise<void> {
    // In a real implementation, this would call the Microsoft Graph API to archive the site
    // For now, we'll just log the action
    
    await this.auditService.createAuditEvent(
      'appeal.site.archived',
      userUpn,
      {
        appealId,
        archivedBy: userUpn,
        archivedAt: new Date().toISOString()
      },
      'archive_appeal_site_' + appealId,
      'dms-core'
    )
  }

  // Get all documents in a specific state
  async getDocumentsByState(state: string): Promise<DocumentCatalogueEntry[]> {
    const catalogueItems = await this.sharepointService.getListItems('DocumentCatalogueListId')
    const result: DocumentCatalogueEntry[] = []
    
    for (const item of catalogueItems) {
      if (item.fields.State === state) {
        result.push({
          docStableId: item.fields.DocStableId,
          siteCollection: item.fields.SiteCollection,
          libraryName: item.fields.LibraryName,
          itemId: item.fields.ItemId,
          version: item.fields.Version,
          title: item.fields.Title,
          state: item.fields.State,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        } as DocumentCatalogueEntry)
      }
    }
    
    return result
  }

  // Move document to different site library (e.g., when changing classification)
  async moveDocument(
    docStableId: string,
    newSiteCollection: string,
    newLibraryName: string,
    userUpn: string
  ): Promise<DocumentCatalogueEntry | null> {
    const catalogueEntry = await this.getDocumentLocation(docStableId)
    if (!catalogueEntry) {
      return null
    }

    // Update the catalogue entry
    const previousLocation = { ...catalogueEntry }
    catalogueEntry.siteCollection = newSiteCollection
    catalogueEntry.libraryName = newLibraryName
    catalogueEntry.updatedAt = new Date().toISOString()
    
    // Find and update the item in SharePoint
    const catalogueItems = await this.sharepointService.getListItems('DocumentCatalogueListId')
    let itemIdToUpdate: string | null = null
    
    for (const item of catalogueItems) {
      if (item.fields.DocStableId === docStableId) {
        itemIdToUpdate = item.id
        break
      }
    }
    
    if (itemIdToUpdate) {
      await this.sharepointService.updateListItem('DocumentCatalogueListId', itemIdToUpdate, {
        SiteCollection: newSiteCollection,
        LibraryName: newLibraryName,
        UpdatedAt: catalogueEntry.updatedAt
      })
    }

    // Log the document move
    await this.auditService.createAuditEvent(
      'document.moved',
      userUpn,
      {
        docStableId,
        previousSiteCollection: previousLocation.siteCollection,
        previousLibraryName: previousLocation.libraryName,
        newSiteCollection,
        newLibraryName,
        movedBy: userUpn
      },
      'move_doc_' + docStableId,
      'dms-core'
    )

    return catalogueEntry
  }

  // Get documents by site collection (for managing specific libraries)
  async getDocumentsBySiteCollection(siteCollection: string): Promise<DocumentCatalogueEntry[]> {
    const catalogueItems = await this.sharepointService.getListItems('DocumentCatalogueListId')
    const result: DocumentCatalogueEntry[] = []
    
    for (const item of catalogueItems) {
      if (item.fields.SiteCollection === siteCollection) {
        result.push({
          docStableId: item.fields.DocStableId,
          siteCollection: item.fields.SiteCollection,
          libraryName: item.fields.LibraryName,
          itemId: item.fields.ItemId,
          version: item.fields.Version,
          title: item.fields.Title,
          state: item.fields.State,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        } as DocumentCatalogueEntry)
      }
    }
    
    return result
  }
}
