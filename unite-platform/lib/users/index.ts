// User Management Service for Unite Platform
import { TokenPayload } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService, AccessLevel } from '@/lib/access'

export interface User {
  id: string
  oid: string // Object ID from Entra ID
  upn: string // User Principal Name
  displayName: string
  email: string
  department: string
  jobTitle: string
  accessLevel: AccessLevel
  committees: CommitteeMembership[]
  departmentsRepresented: DepartmentRepresentation[]
  msGroups: string[] // Microsoft 365 Groups the user belongs to
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CommitteeMembership {
  committeeId: string
  committeeName: string
  role: 'member' | 'chair' | 'secretary' | 'deputy-chair' | 'observer'
  startDate: string
  endDate?: string
  permissions: string[]
}

export interface DepartmentRepresentation {
  departmentId: string
  departmentName: string
  representedBy: string // User ID of the person representing this department
  representativeId: string // User ID of the person who is the representative
  startDate: string
  endDate?: string
}

export interface Committee {
  id: string
  name: string
  description: string
  parentCommitteeId?: string
  members: CommitteeMembership[]
  emailGroup: string // Microsoft 365 Group for this committee
  permissions: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: string
  name: string
  description: string
  parentDepartmentId?: string
  representatives: string[] // User IDs
  emailGroup: string // Microsoft 365 Group for this department
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserRoleAssignment {
  id: string
  userId: string
  roleId: string
  roleName: string
  scope: 'global' | 'committee' | 'department' | 'document'
  scopeId?: string
  assignedBy: string
  assignedAt: string
  expiresAt?: string
}

export class UserManagementService {
  private sharepointService: SharePointService
  private auditService: AuditService
  private accessControlService: AccessControlService

  constructor(
    sharepointService: SharePointService,
    auditService: AuditService,
    accessControlService: AccessControlService
  ) {
    this.sharepointService = sharepointService
    this.auditService = auditService
    this.accessControlService = accessControlService
  }

  // Get user by OID (object ID from Entra ID)
  async getUserByOid(oid: string): Promise<User | null> {
    const usersList = await this.sharepointService.getListItems('usersListId')
    
    for (const item of usersList) {
      if (item.fields.Oid === oid) {
        return {
          id: item.fields.Id,
          oid: item.fields.Oid,
          upn: item.fields.Upn,
          displayName: item.fields.DisplayName,
          email: item.fields.Email,
          department: item.fields.Department,
          jobTitle: item.fields.JobTitle,
          accessLevel: item.fields.AccessLevel as AccessLevel,
          committees: item.fields.Committees ? JSON.parse(item.fields.Committees) : [],
          departmentsRepresented: item.fields.DepartmentsRepresented ? JSON.parse(item.fields.DepartmentsRepresented) : [],
          msGroups: item.fields.MsGroups ? item.fields.MsGroups.split(',') : [],
          isActive: item.fields.IsActive,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        }
      }
    }
    
    return null
  }

  // Get user by ID
  async getUser(userId: string): Promise<User | null> {
    const usersList = await this.sharepointService.getListItems('usersListId')
    
    for (const item of usersList) {
      if (item.fields.Id === userId) {
        return {
          id: item.fields.Id,
          oid: item.fields.Oid,
          upn: item.fields.Upn,
          displayName: item.fields.DisplayName,
          email: item.fields.Email,
          department: item.fields.Department,
          jobTitle: item.fields.JobTitle,
          accessLevel: item.fields.AccessLevel as AccessLevel,
          committees: item.fields.Committees ? JSON.parse(item.fields.Committees) : [],
          departmentsRepresented: item.fields.DepartmentsRepresented ? JSON.parse(item.fields.DepartmentsRepresented) : [],
          msGroups: item.fields.MsGroups ? item.fields.MsGroups.split(',') : [],
          isActive: item.fields.IsActive,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        }
      }
    }
    
    return null
  }

  // Add user to a committee
  async addUserToCommittee(
    requestingUser: TokenPayload,
    userId: string,
    committeeId: string,
    role: 'member' | 'chair' | 'secretary' | 'deputy-chair' | 'observer',
    permissions: string[] = []
  ): Promise<User> {
    const user = await this.getUser(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const committee = await this.getCommittee(committeeId)
    if (!committee) {
      throw new Error('Committee not found')
    }

    // Check if requesting user has permission to manage this committee
    const requestingUserDetails = await this.getUserByOid(requestingUser.oid)
    if (!requestingUserDetails || !this.canManageCommittee(requestingUserDetails, committeeId)) {
      throw new Error('User does not have permission to manage this committee')
    }

    // Check if user is already in this committee
    const existingMembership = user.committees.find(cm => cm.committeeId === committeeId)
    if (existingMembership) {
      // Update existing membership
      existingMembership.role = role
      existingMembership.permissions = permissions
      existingMembership.startDate = new Date().toISOString()
    } else {
      // Add new membership
      const newMembership: CommitteeMembership = {
        committeeId,
        committeeName: committee.name,
        role,
        startDate: new Date().toISOString(),
        permissions
      }
      user.committees.push(newMembership)
    }

    user.updatedAt = new Date().toISOString()

    // Update user in SharePoint
    await this.updateUserInSharePoint(user)

    // Add user to the committee's Microsoft 365 Group
    await this.addUserToMsGroup(user.email, committee.emailGroup)

    // Log the action
    await this.auditService.createAuditEvent(
      'user.added_to_committee',
      requestingUser.upn,
      {
        userId,
        committeeId,
        role,
        addedBy: requestingUser.oid
      },
      'add_user_to_committee_' + userId + '_' + committeeId,
      'unite-users'
    )

    return user
  }

  // Remove user from a committee
  async removeUserFromCommittee(
    requestingUser: TokenPayload,
    userId: string,
    committeeId: string
  ): Promise<User> {
    const user = await this.getUser(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const committee = await this.getCommittee(committeeId)
    if (!committee) {
      throw new Error('Committee not found')
    }

    // Check if requesting user has permission to manage this committee
    const requestingUserDetails = await this.getUserByOid(requestingUser.oid)
    if (!requestingUserDetails || !this.canManageCommittee(requestingUserDetails, committeeId)) {
      throw new Error('User does not have permission to manage this committee')
    }

    // Remove committee membership
    user.committees = user.committees.filter(cm => cm.committeeId !== committeeId)
    user.updatedAt = new Date().toISOString()

    // Update user in SharePoint
    await this.updateUserInSharePoint(user)

    // Remove user from the committee's Microsoft 365 Group
    await this.removeUserFromMsGroup(user.email, committee.emailGroup)

    // Log the action
    await this.auditService.createAuditEvent(
      'user.removed_from_committee',
      requestingUser.upn,
      {
        userId,
        committeeId,
        removedBy: requestingUser.oid
      },
      'remove_user_from_committee_' + userId + '_' + committeeId,
      'unite-users'
    )

    return user
  }

  // Assign a user as a department representative
  async assignDepartmentRepresentative(
    requestingUser: TokenPayload,
    userId: string,
    departmentId: string
  ): Promise<User> {
    const user = await this.getUser(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const department = await this.getDepartment(departmentId)
    if (!department) {
      throw new Error('Department not found')
    }

    // Check if requesting user has admin permissions
    const requestingUserDetails = await this.getUserByOid(requestingUser.oid)
    if (!requestingUserDetails || requestingUserDetails.accessLevel !== AccessLevel.Admin) {
      throw new Error('Only admins can assign department representatives')
    }

    // Check if user is already representing this department
    const existingRepresentation = user.departmentsRepresented.find(dr => dr.departmentId === departmentId)
    if (existingRepresentation) {
      // Update existing representation
      existingRepresentation.representativeId = userId
      existingRepresentation.startDate = new Date().toISOString()
    } else {
      // Add new representation
      const newRepresentation: DepartmentRepresentation = {
        departmentId,
        departmentName: department.name,
        representedBy: userId, // This is redundant but kept for consistency
        representativeId: userId,
        startDate: new Date().toISOString()
      }
      user.departmentsRepresented.push(newRepresentation)
    }

    user.updatedAt = new Date().toISOString()

    // Update user in SharePoint
    await this.updateUserInSharePoint(user)

    // Add user to the department's Microsoft 365 Group
    await this.addUserToMsGroup(user.email, department.emailGroup)

    // Log the action
    await this.auditService.createAuditEvent(
      'user.assigned_as_department_representative',
      requestingUser.upn,
      {
        userId,
        departmentId,
        assignedBy: requestingUser.oid
      },
      'assign_dept_rep_' + userId + '_' + departmentId,
      'unite-users'
    )

    return user
  }

  // Create a new site library (for use by site admins)
  async createSiteLibrary(
    requestingUser: TokenPayload,
    name: string,
    description: string,
    purpose: string,
    allowedAccessLevels: string[],
    retentionPeriod: number,
    emailGroupName: string
  ): Promise<string> {
    // Check if requesting user has admin permissions
    const requestingUserDetails = await this.getUserByOid(requestingUser.oid)
    if (!requestingUserDetails || 
        (requestingUserDetails.accessLevel !== AccessLevel.Admin && 
         requestingUserDetails.accessLevel !== AccessLevel.Executive)) {
      throw new Error('Only admins and executives can create site libraries')
    }

    // In a real implementation, this would create a new SharePoint site collection
    // For now, we'll simulate by creating a configuration entry
    const libraryId = this.generateId()
    
    const siteLibrary = {
      id: libraryId,
      name,
      description,
      purpose,
      allowedAccessLevels,
      retentionPeriod,
      emailGroup: emailGroupName,
      createdAt: new Date().toISOString(),
      createdBy: requestingUser.oid
    }

    // Store in SharePoint
    await this.sharepointService.addListItem('siteLibrariesListId', {
      Id: libraryId,
      Name: name,
      Description: description,
      Purpose: purpose,
      AllowedAccessLevels: allowedAccessLevels.join(','),
      RetentionPeriod: retentionPeriod,
      EmailGroup: emailGroupName,
      CreatedAt: siteLibrary.createdAt,
      CreatedBy: requestingUser.oid
    })

    // Create the Microsoft 365 Group
    await this.createMsGroup(emailGroupName, description)

    // Log the action
    await this.auditService.createAuditEvent(
      'site_library.created',
      requestingUser.upn,
      {
        libraryId,
        name,
        purpose,
        emailGroup: emailGroupName,
        createdBy: requestingUser.oid
      },
      'create_site_library_' + libraryId,
      'unite-libraries'
    )

    return libraryId
  }

  // Get all users in a specific committee
  async getUsersInCommittee(committeeId: string): Promise<User[]> {
    const usersList = await this.sharepointService.getListItems('usersListId')
    const committeeUsers: User[] = []
    
    for (const item of usersList) {
      const committees = item.fields.Committees ? JSON.parse(item.fields.Committees) : []
      const isInCommittee = committees.some((cm: CommitteeMembership) => cm.committeeId === committeeId)
      
      if (isInCommittee) {
        committeeUsers.push({
          id: item.fields.Id,
          oid: item.fields.Oid,
          upn: item.fields.Upn,
          displayName: item.fields.DisplayName,
          email: item.fields.Email,
          department: item.fields.Department,
          jobTitle: item.fields.JobTitle,
          accessLevel: item.fields.AccessLevel as AccessLevel,
          committees,
          departmentsRepresented: item.fields.DepartmentsRepresented ? JSON.parse(item.fields.DepartmentsRepresented) : [],
          msGroups: item.fields.MsGroups ? item.fields.MsGroups.split(',') : [],
          isActive: item.fields.IsActive,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        })
      }
    }
    
    return committeeUsers
  }

  // Get all committees a user belongs to
  async getCommitteesForUser(userId: string): Promise<CommitteeMembership[]> {
    const user = await this.getUser(userId)
    return user?.committees || []
  }

  // Get all departments a user represents
  async getDepartmentsRepresentedByUser(userId: string): Promise<DepartmentRepresentation[]> {
    const user = await this.getUser(userId)
    return user?.departmentsRepresented || []
  }

  // Get committee by ID
  private async getCommittee(committeeId: string): Promise<Committee | null> {
    const committeesList = await this.sharepointService.getListItems('committeesListId')
    
    for (const item of committeesList) {
      if (item.fields.Id === committeeId) {
        return {
          id: item.fields.Id,
          name: item.fields.Name,
          description: item.fields.Description,
          parentCommitteeId: item.fields.ParentCommitteeId,
          members: item.fields.Members ? JSON.parse(item.fields.Members) : [],
          emailGroup: item.fields.EmailGroup,
          permissions: item.fields.Permissions ? item.fields.Permissions.split(',') : [],
          isActive: item.fields.IsActive,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        }
      }
    }
    
    return null
  }

  // Get department by ID
  private async getDepartment(departmentId: string): Promise<Department | null> {
    const departmentsList = await this.sharepointService.getListItems('departmentsListId')
    
    for (const item of departmentsList) {
      if (item.fields.Id === departmentId) {
        return {
          id: item.fields.Id,
          name: item.fields.Name,
          description: item.fields.Description,
          parentDepartmentId: item.fields.ParentDepartmentId,
          representatives: item.fields.Representatives ? JSON.parse(item.fields.Representatives) : [],
          emailGroup: item.fields.EmailGroup,
          isActive: item.fields.IsActive,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        }
      }
    }
    
    return null
  }

  // Check if user can manage a committee
  private canManageCommittee(user: User, committeeId: string): boolean {
    // Admins can manage any committee
    if (user.accessLevel === AccessLevel.Admin) return true
    
    // Check if user is chair of the committee
    const membership = user.committees.find(cm => cm.committeeId === committeeId)
    if (membership && (membership.role === 'chair' || membership.role === 'secretary')) {
      return true
    }
    
    return false
  }

  // Add user to Microsoft 365 Group
  private async addUserToMsGroup(userEmail: string, groupName: string): Promise<void> {
    // In a real implementation, this would call the Microsoft Graph API
    // For now, we'll just log the action
    await this.auditService.createAuditEvent(
      'ms_group.user_added',
      'system',
      {
        userEmail,
        groupName,
        action: 'add_user_to_group_simulation'
      },
      'add_user_to_ms_group_' + userEmail + '_' + groupName + '_' + Date.now(),
      'unite-groups'
    )
  }

  // Remove user from Microsoft 365 Group
  private async removeUserFromMsGroup(userEmail: string, groupName: string): Promise<void> {
    // In a real implementation, this would call the Microsoft Graph API
    // For now, we'll just log the action
    await this.auditService.createAuditEvent(
      'ms_group.user_removed',
      'system',
      {
        userEmail,
        groupName,
        action: 'remove_user_from_group_simulation'
      },
      'remove_user_from_ms_group_' + userEmail + '_' + groupName + '_' + Date.now(),
      'unite-groups'
    )
  }

  // Create Microsoft 365 Group
  private async createMsGroup(groupName: string, description: string): Promise<void> {
    // In a real implementation, this would call the Microsoft Graph API
    // For now, we'll just log the action
    await this.auditService.createAuditEvent(
      'ms_group.created',
      'system',
      {
        groupName,
        description,
        action: 'create_group_simulation'
      },
      'create_ms_group_' + groupName + '_' + Date.now(),
      'unite-groups'
    )
  }

  // Update user in SharePoint
  private async updateUserInSharePoint(user: User): Promise<void> {
    await this.sharepointService.updateListItem('usersListId', user.id, {
      DisplayName: user.displayName,
      Email: user.email,
      Department: user.department,
      JobTitle: user.jobTitle,
      AccessLevel: user.accessLevel,
      Committees: JSON.stringify(user.committees),
      DepartmentsRepresented: JSON.stringify(user.departmentsRepresented),
      MsGroups: user.msGroups.join(','),
      IsActive: user.isActive,
      UpdatedAt: user.updatedAt
    })
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  // Get all committees
  async getAllCommittees(): Promise<Committee[]> {
    const committeesList = await this.sharepointService.getListItems('committeesListId')
    return committeesList.map(item => ({
      id: item.fields.Id,
      name: item.fields.Name,
      description: item.fields.Description,
      parentCommitteeId: item.fields.ParentCommitteeId,
      members: item.fields.Members ? JSON.parse(item.fields.Members) : [],
      emailGroup: item.fields.EmailGroup,
      permissions: item.fields.Permissions ? item.fields.Permissions.split(',') : [],
      isActive: item.fields.IsActive,
      createdAt: item.fields.CreatedAt,
      updatedAt: item.fields.UpdatedAt
    }))
  }

  // Get all departments
  async getAllDepartments(): Promise<Department[]> {
    const departmentsList = await this.sharepointService.getListItems('departmentsListId')
    return departmentsList.map(item => ({
      id: item.fields.Id,
      name: item.fields.Name,
      description: item.fields.Description,
      parentDepartmentId: item.fields.ParentDepartmentId,
      representatives: item.fields.Representatives ? JSON.parse(item.fields.Representatives) : [],
      emailGroup: item.fields.EmailGroup,
      isActive: item.fields.IsActive,
      createdAt: item.fields.CreatedAt,
      updatedAt: item.fields.UpdatedAt
    }))
  }

  // Get users by access level
  async getUsersByAccessLevel(level: AccessLevel): Promise<User[]> {
    const usersList = await this.sharepointService.getListItems('usersListId')
    const filteredUsers: User[] = []
    
    for (const item of usersList) {
      if (item.fields.AccessLevel === level) {
        filteredUsers.push({
          id: item.fields.Id,
          oid: item.fields.Oid,
          upn: item.fields.Upn,
          displayName: item.fields.DisplayName,
          email: item.fields.Email,
          department: item.fields.Department,
          jobTitle: item.fields.JobTitle,
          accessLevel: item.fields.AccessLevel as AccessLevel,
          committees: item.fields.Committees ? JSON.parse(item.fields.Committees) : [],
          departmentsRepresented: item.fields.DepartmentsRepresented ? JSON.parse(item.fields.DepartmentsRepresented) : [],
          msGroups: item.fields.MsGroups ? item.fields.MsGroups.split(',') : [],
          isActive: item.fields.IsActive,
          createdAt: item.fields.CreatedAt,
          updatedAt: item.fields.UpdatedAt
        })
      }
    }
    
    return filteredUsers
  }
}
