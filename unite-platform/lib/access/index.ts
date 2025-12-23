// Access Control Service for Unite Platform
import { TokenPayload, UserRole } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'

export enum AccessLevel {
  Public = 'Public',
  Diplomate = 'Diplomate',
  CommitteeMember = 'CommitteeMember',
  Executive = 'Executive',
  Admin = 'Admin'
}

export enum DocumentState {
  Draft = 'Draft',
  PendingApproval = 'PendingApproval',
  Approved = 'Approved',
  Published = 'Published',
  Redacted = 'Redacted',
  Rescinded = 'Rescinded'
}

export interface UserPermissions {
  accessLevel: AccessLevel
  committees: string[]
  permissions: string[]
  canRead: boolean
  canWrite: boolean
  canApprove: boolean
  canPublish: boolean
  canRedact: boolean
  canRescind: boolean
}

export interface DocumentPermissions {
  id: string
  title: string
  state: DocumentState
  allowedAccessLevels: AccessLevel[]
  allowedCommittees: string[]
  allowedUsers: string[]
  versionHistoryEnabled: boolean
  createdAt: string
  updatedAt: string
}

export class AccessControlService {
  private sharepointService: SharePointService
  private auditService: AuditService

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService
    this.auditService = auditService
  }

  // Determine user permissions based on their role and group memberships
  async getUserPermissions(user: TokenPayload): Promise<UserPermissions> {
    // Determine access level based on user roles
    let accessLevel: AccessLevel = AccessLevel.Public
    let committees: string[] = []
    let permissions: string[] = []

    // Extract committees from user's roles or attributes
    if (user.roles) {
      // Extract committee memberships from roles (e.g., 'committee:standards', 'committee:edi')
      committees = user.roles
        .filter(role => role.startsWith('committee:'))
        .map(role => role.split(':')[1])
      
      // Check for executive role
      if (user.roles.includes('Executive') || user.roles.includes('executive')) {
        accessLevel = AccessLevel.Executive
      }
      // Check for admin role
      else if (user.roles.includes('Admin') || user.roles.includes('admin')) {
        accessLevel = AccessLevel.Admin
      }
      // Check for committee member role
      else if (user.roles.includes('CommitteeMember') || user.roles.includes('committeemember') || committees.length > 0) {
        accessLevel = AccessLevel.CommitteeMember
      }
      // Check for diplomate role
      else if (user.roles.includes('Diplomate') || user.roles.includes('diplomate')) {
        accessLevel = AccessLevel.Diplomate
      }
    }

    // Determine specific permissions based on access level
    const basePermissions: UserPermissions = {
      accessLevel,
      committees,
      permissions,
      canRead: false,
      canWrite: false,
      canApprove: false,
      canPublish: false,
      canRedact: false,
      canRescind: false,
    }

    // Assign permissions based on access level
    switch (accessLevel) {
      case AccessLevel.Admin:
        basePermissions.canRead = true
        basePermissions.canWrite = true
        basePermissions.canApprove = true
        basePermissions.canPublish = true
        basePermissions.canRedact = true
        basePermissions.canRescind = true
        break
      case AccessLevel.Executive:
        basePermissions.canRead = true
        basePermissions.canWrite = true
        basePermissions.canApprove = true
        basePermissions.canPublish = true
        basePermissions.canRedact = true
        basePermissions.canRescind = false
        break
      case AccessLevel.CommitteeMember:
        basePermissions.canRead = true
        // Allow write if user is in the document's committee
        basePermissions.canWrite = false // Will be determined per document
        basePermissions.canApprove = false
        basePermissions.canPublish = false
        basePermissions.canRedact = false
        basePermissions.canRescind = false
        break
      case AccessLevel.Diplomate:
        basePermissions.canRead = true
        basePermissions.canWrite = false
        basePermissions.canApprove = false
        basePermissions.canPublish = false
        basePermissions.canRedact = false
        basePermissions.canRescind = false
        break
      case AccessLevel.Public:
        basePermissions.canRead = false // Will be determined per document
        basePermissions.canWrite = false
        basePermissions.canApprove = false
        basePermissions.canPublish = false
        basePermissions.canRedact = false
        basePermissions.canRescind = false
        break
    }

    return basePermissions
  }

  // Check if a user can access a specific document
  async canAccessDocument(user: TokenPayload, document: DocumentPermissions): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(user)
    
    // Public access check
    if (userPermissions.accessLevel === AccessLevel.Public) {
      return document.allowedAccessLevels.includes(AccessLevel.Public)
    }
    
    // Check if user's access level is allowed
    if (document.allowedAccessLevels.includes(userPermissions.accessLevel)) {
      return true
    }
    
    // Check if user is in allowed committees
    if (document.allowedCommittees.some(committee => userPermissions.committees.includes(committee))) {
      return true
    }
    
    // Check if user is specifically allowed
    if (document.allowedUsers.includes(user.oid)) {
      return true
    }
    
    return false
  }

  // Check if a user can perform a specific action on a document
  async canPerformAction(
    user: TokenPayload, 
    document: DocumentPermissions, 
    action: 'read' | 'write' | 'approve' | 'publish' | 'redact' | 'rescind'
  ): Promise<boolean> {
    // First check if user can access the document
    if (!(await this.canAccessDocument(user, document))) {
      return false
    }
    
    const userPermissions = await this.getUserPermissions(user)
    
    // Check specific action permissions
    switch (action) {
      case 'read':
        return userPermissions.canRead
      case 'write':
        // Committee members can write only if they're in the document's committee
        if (userPermissions.accessLevel === AccessLevel.CommitteeMember) {
          return document.allowedCommittees.some(committee => 
            userPermissions.committees.includes(committee)
          )
        }
        return userPermissions.canWrite
      case 'approve':
        return userPermissions.canApprove
      case 'publish':
        return userPermissions.canPublish
      case 'redact':
        return userPermissions.canRedact
      case 'rescind':
        return userPermissions.canRescind
      default:
        return false
    }
  }

  // Create or update document permissions in SharePoint
  async setDocumentPermissions(
    documentId: string,
    allowedAccessLevels: AccessLevel[],
    allowedCommittees: string[],
    allowedUsers: string[],
    versionHistoryEnabled: boolean = false
  ): Promise<void> {
    // Store document permissions in SharePoint list
    await this.sharepointService.addListItem('documentPermissionsListId', {
      DocumentId: documentId,
      AllowedAccessLevels: allowedAccessLevels.join(','),
      AllowedCommittees: allowedCommittees.join(','),
      AllowedUsers: allowedUsers.join(','),
      VersionHistoryEnabled: versionHistoryEnabled,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    })
  }

  // Get document permissions
  async getDocumentPermissions(documentId: string): Promise<DocumentPermissions | null> {
    // Get document permissions from SharePoint list
    const permissionsList = await this.sharepointService.getListItems('documentPermissionsListId')
    
    for (const item of permissionsList) {
      if (item.fields.DocumentId === documentId) {
        return {
          id: documentId,
          title: item.fields.Title || 'Untitled Document',
          state: item.fields.State as DocumentState || DocumentState.Draft,
          allowedAccessLevels: item.fields.AllowedAccessLevels?.split(',') || [],
          allowedCommittees: item.fields.AllowedCommittees?.split(',') || [],
          allowedUsers: item.fields.AllowedUsers?.split(',') || [],
          versionHistoryEnabled: item.fields.VersionHistoryEnabled || false,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        }
      }
    }
    
    return null
  }
}
