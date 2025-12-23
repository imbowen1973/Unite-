// Document Workflow Service for Unite Platform with DMS Integration
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel, DocumentState, DocumentPermissions } from '@/lib/access'
import { DMSService } from '@/lib/dms'

export interface DocumentMetadata {
  id: string
  docStableId: string
  title: string
  description: string
  state: DocumentState
  version: string
  contentType: string
  size: number
  createdBy: string
  createdDate: string
  lastModifiedBy: string
  lastModifiedDate: string
  tags: string[]
  committees: string[]
  allowedAccessLevels: AccessLevel[]
  versionHistoryEnabled: boolean
}

export interface WorkflowAction {
  action: string
  actor: string
  timestamp: string
  previousState: DocumentState
  newState: DocumentState
  reason?: string
  metadata: Record<string, any>
}

export class DocumentWorkflowService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService
  private dmsService: DMSService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService,
    dmsService: DMSService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
    this.dmsService = dmsService
  }

  // Create a new document draft
  async createDraft(
    user: TokenPayload,
    title: string,
    description: string,
    content: Buffer | ArrayBuffer,
    committees: string[],
    allowedAccessLevels: AccessLevel[],
    versionHistoryEnabled: boolean = false,
    siteCollection: string = 'unite-docs' // Default site collection
  ): Promise<DocumentMetadata> {
    // Check if user has write permissions
    const userPermissions = await this.accessControlService.getUserPermissions(user)
    if (!userPermissions.canWrite) {
      throw new Error('User does not have permission to create documents')
    }

    // Generate a docStableId for permanent reference
    const docStableId = this.generateDocStableId()

    // Upload the document to the appropriate SharePoint site
    const file = await this.sharepointService.uploadFile(
      title,
      content,
      'drafts',
      docStableId
    )

    // Create document metadata
    const document: DocumentMetadata = {
      id: file.id,
      docStableId,
      title,
      description,
      state: DocumentState.Draft,
      version: '1.0',
      contentType: file.name.split('.').pop() || 'unknown',
      size: file.size,
      createdBy: user.oid,
      createdDate: file.createdDateTime,
      lastModifiedBy: user.oid,
      lastModifiedDate: file.lastModifiedDateTime,
      tags: [],
      committees,
      allowedAccessLevels,
      versionHistoryEnabled
    }

    // Set document permissions
    await this.accessControlService.setDocumentPermissions(
      file.id,
      allowedAccessLevels,
      committees,
      [], // Initially no specific users allowed beyond committee
      versionHistoryEnabled
    )

    // Register the document in the DMS catalogue
    await this.dmsService.registerDocument(
      docStableId,
      siteCollection, // Use the specified site collection
      'Documents', // Default library name
      file.id,
      title,
      DocumentState.Draft
    )

    // Log the creation action
    await this.auditService.createAuditEvent(
      'document.created',
      user.upn,
      {
        documentId: file.id,
        docStableId,
        title,
        state: DocumentState.Draft
      },
      'create_draft_' + docStableId,
      siteCollection // Log to the specific site's audit trail
    )

    return document
  }

  // Submit document for approval
  async submitForApproval(
    user: TokenPayload,
    docStableId: string,
    reason?: string
  ): Promise<DocumentMetadata> {
    const document = await this.getDocumentByDocStableId(docStableId)
    if (!document) {
      throw new Error('Document with docStableId ' + docStableId + ' not found')
    }

    // Check if user has permission to submit for approval
    const canPerform = await this.accessControlService.canPerformAction(
      user, 
      this.convertToDocumentPermissions(document), 
      'write'
    )
    if (!canPerform) {
      throw new Error('User does not have permission to submit document for approval')
    }

    // Update document state in DMS catalogue
    const updatedCatalogueEntry = await this.dmsService.updateDocumentState(
      docStableId,
      DocumentState.PendingApproval,
      user.upn
    )

    if (!updatedCatalogueEntry) {
      throw new Error('Failed to update document state in DMS catalogue')
    }

    // Update document state in SharePoint
    await this.sharepointService.updateFileProperties(document.id, {
      state: DocumentState.PendingApproval
    })

    // Update document metadata
    const updatedDocument = {
      ...document,
      state: DocumentState.PendingApproval,
      lastModifiedBy: user.oid,
      lastModifiedDate: new Date().toISOString()
    }

    // Log the state change
    await this.auditService.createAuditEvent(
      'document.submitted_for_approval',
      user.upn,
      {
        documentId: document.id,
        docStableId,
        previousState: document.state,
        newState: DocumentState.PendingApproval,
        reason
      },
      'submit_approval_' + docStableId,
      updatedCatalogueEntry.siteCollection
    )

    return updatedDocument
  }

  // Approve document
  async approve(
    user: TokenPayload,
    docStableId: string,
    reason?: string
  ): Promise<DocumentMetadata> {
    const document = await this.getDocumentByDocStableId(docStableId)
    if (!document) {
      throw new Error('Document with docStableId ' + docStableId + ' not found')
    }

    // Check if user has permission to approve
    const canPerform = await this.accessControlService.canPerformAction(
      user, 
      this.convertToDocumentPermissions(document), 
      'approve'
    )
    if (!canPerform) {
      throw new Error('User does not have permission to approve document')
    }

    // Update document state in DMS catalogue
    const updatedCatalogueEntry = await this.dmsService.updateDocumentState(
      docStableId,
      DocumentState.Approved,
      user.upn
    )

    if (!updatedCatalogueEntry) {
      throw new Error('Failed to update document state in DMS catalogue')
    }

    // Update document state in SharePoint
    await this.sharepointService.updateFileProperties(document.id, {
      state: DocumentState.Approved
    })

    // Update document metadata
    const updatedDocument = {
      ...document,
      state: DocumentState.Approved,
      lastModifiedBy: user.oid,
      lastModifiedDate: new Date().toISOString()
    }

    // Log the approval
    await this.auditService.createAuditEvent(
      'document.approved',
      user.upn,
      {
        documentId: document.id,
        docStableId,
        previousState: document.state,
        newState: DocumentState.Approved,
        approver: user.upn,
        reason
      },
      'approve_' + docStableId,
      updatedCatalogueEntry.siteCollection
    )

    return updatedDocument
  }

  // Publish document
  async publish(
    user: TokenPayload,
    docStableId: string,
    reason?: string
  ): Promise<DocumentMetadata> {
    const document = await this.getDocumentByDocStableId(docStableId)
    if (!document) {
      throw new Error('Document with docStableId ' + docStableId + ' not found')
    }

    // Check if user has permission to publish
    const canPerform = await this.accessControlService.canPerformAction(
      user, 
      this.convertToDocumentPermissions(document), 
      'publish'
    )
    if (!canPerform) {
      throw new Error('User does not have permission to publish document')
    }

    // Update document state in DMS catalogue
    const updatedCatalogueEntry = await this.dmsService.updateDocumentState(
      docStableId,
      DocumentState.Published,
      user.upn
    )

    if (!updatedCatalogueEntry) {
      throw new Error('Failed to update document state in DMS catalogue')
    }

    // Update document state in SharePoint
    await this.sharepointService.updateFileProperties(document.id, {
      state: DocumentState.Published
    })

    // Update document metadata
    const updatedDocument = {
      ...document,
      state: DocumentState.Published,
      lastModifiedBy: user.oid,
      lastModifiedDate: new Date().toISOString()
    }

    // Log the publication
    await this.auditService.createAuditEvent(
      'document.published',
      user.upn,
      {
        documentId: document.id,
        docStableId,
        previousState: document.state,
        newState: DocumentState.Published,
        publisher: user.upn,
        reason
      },
      'publish_' + docStableId,
      updatedCatalogueEntry.siteCollection
    )

    return updatedDocument
  }

  // Redact document
  async redact(
    user: TokenPayload,
    docStableId: string,
    reason?: string
  ): Promise<DocumentMetadata> {
    const document = await this.getDocumentByDocStableId(docStableId)
    if (!document) {
      throw new Error('Document with docStableId ' + docStableId + ' not found')
    }

    // Check if user has permission to redact
    const canPerform = await this.accessControlService.canPerformAction(
      user, 
      this.convertToDocumentPermissions(document), 
      'redact'
    )
    if (!canPerform) {
      throw new Error('User does not have permission to redact document')
    }

    // Update document state in DMS catalogue
    const updatedCatalogueEntry = await this.dmsService.updateDocumentState(
      docStableId,
      DocumentState.Redacted,
      user.upn
    )

    if (!updatedCatalogueEntry) {
      throw new Error('Failed to update document state in DMS catalogue')
    }

    // Update document state in SharePoint
    await this.sharepointService.updateFileProperties(document.id, {
      state: DocumentState.Redacted
    })

    // Update document metadata
    const updatedDocument = {
      ...document,
      state: DocumentState.Redacted,
      lastModifiedBy: user.oid,
      lastModifiedDate: new Date().toISOString()
    }

    // Log the redaction
    await this.auditService.createAuditEvent(
      'document.redacted',
      user.upn,
      {
        documentId: document.id,
        docStableId,
        previousState: document.state,
        newState: DocumentState.Redacted,
        redacter: user.upn,
        reason
      },
      'redact_' + docStableId,
      updatedCatalogueEntry.siteCollection
    )

    return updatedDocument
  }

  // Rescind document
  async rescind(
    user: TokenPayload,
    docStableId: string,
    reason?: string
  ): Promise<DocumentMetadata> {
    const document = await this.getDocumentByDocStableId(docStableId)
    if (!document) {
      throw new Error('Document with docStableId ' + docStableId + ' not found')
    }

    // Check if user has permission to rescind
    const canPerform = await this.accessControlService.canPerformAction(
      user, 
      this.convertToDocumentPermissions(document), 
      'rescind'
    )
    if (!canPerform) {
      throw new Error('User does not have permission to rescind document')
    }

    // Update document state in DMS catalogue
    const updatedCatalogueEntry = await this.dmsService.updateDocumentState(
      docStableId,
      DocumentState.Rescinded,
      user.upn
    )

    if (!updatedCatalogueEntry) {
      throw new Error('Failed to update document state in DMS catalogue')
    }

    // Update document state in SharePoint
    await this.sharepointService.updateFileProperties(document.id, {
      state: DocumentState.Rescinded
    })

    // Update document metadata
    const updatedDocument = {
      ...document,
      state: DocumentState.Rescinded,
      lastModifiedBy: user.oid,
      lastModifiedDate: new Date().toISOString()
    }

    // Log the rescission
    await this.auditService.createAuditEvent(
      'document.rescinded',
      user.upn,
      {
        documentId: document.id,
        docStableId,
        previousState: document.state,
        newState: DocumentState.Rescinded,
        resinder: user.upn,
        reason
      },
      'rescind_' + docStableId,
      updatedCatalogueEntry.siteCollection
    )

    return updatedDocument
  }

  // Get document by docStableId
  async getDocumentByDocStableId(docStableId: string): Promise<DocumentMetadata | null> {
    // Get document location from DMS catalogue
    const catalogueEntry = await this.dmsService.getDocumentLocation(docStableId)
    if (!catalogueEntry) {
      return null
    }

    // Get document from the appropriate site collection
    const file = await this.sharepointService.getFileById(catalogueEntry.itemId)
    if (!file) {
      return null
    }

    // Get document permissions
    const permissions = await this.accessControlService.getDocumentPermissions(file.id)
    
    return {
      id: file.id,
      docStableId: file.docStableId || docStableId,
      title: file.name,
      description: 'Document description', // Would come from SharePoint metadata
      state: permissions?.state || DocumentState.Draft,
      version: '1.0', // Would come from SharePoint version info
      contentType: file.name.split('.').pop() || 'unknown',
      size: file.size,
      createdBy: file.createdBy.user.email || 'unknown',
      createdDate: file.createdDateTime,
      lastModifiedBy: file.lastModifiedDateTime ? file.createdBy.user.email || 'unknown' : 'unknown',
      lastModifiedDate: file.lastModifiedDateTime || file.createdDateTime,
      tags: [],
      committees: permissions?.allowedCommittees || [],
      allowedAccessLevels: permissions?.allowedAccessLevels || [AccessLevel.Public],
      versionHistoryEnabled: permissions?.versionHistoryEnabled || false
    }
  }

  // Generate a docStableId for permanent reference
  private generateDocStableId(): string {
    const prefix = 'DOC'
    const suffix = Date.now().toString(36).toUpperCase()
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    return prefix + '-' + suffix + '-' + randomPart
  }

  // Convert DocumentMetadata to DocumentPermissions
  private convertToDocumentPermissions(document: DocumentMetadata): DocumentPermissions {
    return {
      id: document.id,
      title: document.title,
      state: document.state,
      allowedAccessLevels: document.allowedAccessLevels,
      allowedCommittees: document.committees,
      allowedUsers: [], // Simplified for this example
      versionHistoryEnabled: document.versionHistoryEnabled,
      createdAt: document.createdDate,
      updatedAt: document.lastModifiedDate
    }
  }

  // Log file access for audit trail
  async logFileAccess(
    user: TokenPayload,
    docStableId: string,
    action: 'view' | 'download' | 'edit'
  ): Promise<void> {
    const document = await this.getDocumentByDocStableId(docStableId)
    if (!document) {
      throw new Error('Document with docStableId ' + docStableId + ' not found')
    }

    // Check if user has permission to access the document
    const canAccess = await this.accessControlService.canAccessDocument(
      user,
      this.convertToDocumentPermissions(document)
    )
    if (!canAccess) {
      throw new Error('User does not have permission to access this document')
    }

    // Get document location from DMS catalogue for audit logging
    const catalogueEntry = await this.dmsService.getDocumentLocation(docStableId)
    const siteCollection = catalogueEntry?.siteCollection || 'dms-core'

    // Log the access event
    await this.auditService.createAuditEvent(
      'file.' + action,
      user.upn,
      {
        documentId: document.id,
        docStableId,
        action,
        user: user.upn,
        userAgent: 'Unite Platform' // Would come from request headers in real implementation
      },
      'access_' + action + '_' + docStableId + '_' + Date.now(),
      siteCollection
    )
  }
}
