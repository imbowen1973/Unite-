// User Management API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { UserManagementService } from '@/lib/users'

// Initialize services
const sharepointService = new SharePointService({
  tenantUrl: process.env.SHAREPOINT_TENANT_URL || '',
  clientId: process.env.SHAREPOINT_CLIENT_ID || '',
  clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
  siteId: process.env.SHAREPOINT_SITE_ID || ''
})

const auditService = new AuditService(sharepointService)
const accessControlService = new AccessControlService(sharepointService, auditService)
const userManagementService = new UserManagementService(
  sharepointService,
  auditService,
  accessControlService
)

export async function POST(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const user = await verifyToken(token)
    
    // Parse the request body
    const body = await request.json()
    const { action, ...params } = body

    // Check if user has admin permissions for management actions
    const userPermissions = await accessControlService.getUserPermissions(user)
    const isAdmin = userPermissions.accessLevel === 'Admin' || userPermissions.permissions.includes('manage_users')
    
    // Actions that require admin permissions
    const adminActions = [
      'createCommittee', 
      'createDepartment', 
      'addUserToCommittee', 
      'removeUserFromCommittee', 
      'assignDepartmentRepresentative'
    ]
    
    if (adminActions.includes(action) && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let result: any

    switch (action) {
      case 'createCommittee':
        const { name, description, parentCommitteeId, permissions, emailGroupName } = params
        result = await userManagementService.createCommittee(
          user,
          name,
          description,
          parentCommitteeId,
          permissions || [],
          emailGroupName
        )
        break
        
      case 'createDepartment':
        const { deptName, deptDescription, parentDepartmentId, emailGroup } = params
        result = await userManagementService.createDepartment(
          user,
          deptName,
          deptDescription,
          parentDepartmentId,
          emailGroup
        )
        break
        
      case 'addUserToCommittee':
        const { userId, committeeId, role, permissions: memberPermissions } = params
        result = await userManagementService.addUserToCommittee(
          user,
          userId,
          committeeId,
          role,
          memberPermissions || []
        )
        break
        
      case 'removeUserFromCommittee':
        const { removeUserId, removeCommitteeId } = params
        result = await userManagementService.removeUserFromCommittee(
          user,
          removeUserId,
          removeCommitteeId
        )
        break
        
      case 'assignDepartmentRepresentative':
        const { repUserId, departmentId } = params
        result = await userManagementService.assignDepartmentRepresentative(
          user,
          repUserId,
          departmentId
        )
        break
        
      case 'syncUserFromEntra':
        result = await userManagementService.syncUserFromEntra(user)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log the action for audit trail
    await auditService.createAuditEvent(
      'user_management.action_performed',
      user.upn,
      {
        action,
        params,
        resultId: result?.id || null
      },
      'user_mgmt_action_' + action + '_' + Date.now(),
      'unite-users'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('User Management API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const authenticatedUser = await verifyToken(token)
    
    // Get parameters from query
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const committeeId = searchParams.get('committeeId')
    const departmentId = searchParams.get('departmentId')
    
    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'getUser':
        if (!userId) {
          return NextResponse.json({ error: 'userId parameter is required for getUser action' }, { status: 400 })
        }
        result = await userManagementService.getUser(userId)
        break
        
      case 'getCommittee':
        if (!committeeId) {
          return NextResponse.json({ error: 'committeeId parameter is required for getCommittee action' }, { status: 400 })
        }
        result = await userManagementService.getCommittee(committeeId)
        break
        
      case 'getDepartment':
        if (!departmentId) {
          return NextResponse.json({ error: 'departmentId parameter is required for getDepartment action' }, { status: 400 })
        }
        result = await userManagementService.getDepartment(departmentId)
        break
        
      case 'getUsersByCommittee':
        if (!committeeId) {
          return NextResponse.json({ error: 'committeeId parameter is required for getUsersByCommittee action' }, { status: 400 })
        }
        result = await userManagementService.getUsersByCommittee(committeeId)
        break
        
      case 'getUsersByDepartment':
        if (!departmentId) {
          return NextResponse.json({ error: 'departmentId parameter is required for getUsersByDepartment action' }, { status: 400 })
        }
        result = await userManagementService.getUsersByDepartment(departmentId)
        break
        
      case 'getCurrentUser':
        result = await userManagementService.getUserByOid(authenticatedUser.oid)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!result) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Log the access for audit trail
    await auditService.createAuditEvent(
      'user_management.accessed',
      authenticatedUser.upn,
      {
        action,
        userId,
        committeeId,
        departmentId,
        accessedBy: authenticatedUser.oid
      },
      'access_user_mgmt_' + action + '_' + (userId || committeeId || departmentId || 'self') + '_' + Date.now(),
      'unite-users'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('User Management API GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
