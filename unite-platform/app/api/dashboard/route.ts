// Dashboard API for Unite Platform
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SharePointService } from '@/lib/sharepoint'
import { AuditService } from '@/lib/audit'
import { AccessControlService } from '@/lib/access'
import { DocumentWorkflowService } from '@/lib/workflow'
import { DMSService } from '@/lib/dms'
import { DashboardService } from '@/lib/dashboard'

// Initialize services
const sharepointService = new SharePointService({
  tenantUrl: process.env.SHAREPOINT_TENANT_URL || '',
  clientId: process.env.SHAREPOINT_CLIENT_ID || '',
  clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
  siteId: process.env.SHAREPOINT_SITE_ID || ''
})

const auditService = new AuditService(sharepointService)
const accessControlService = new AccessControlService(sharepointService, auditService)
const dmsService = new DMSService(sharepointService, auditService)
const documentWorkflowService = new DocumentWorkflowService(
  sharepointService,
  auditService,
  accessControlService,
  dmsService
)
const dashboardService = new DashboardService(
  sharepointService,
  auditService,
  accessControlService,
  documentWorkflowService,
  dmsService
)

export async function GET(request: NextRequest) {
  try {
    // Extract token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the token
    const user = await verifyToken(token)
    
    // Get the dashboard section from query parameters
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    
    if (!section) {
      return NextResponse.json({ error: 'Section parameter is required' }, { status: 400 })
    }

    let result: any

    switch (section) {
      case 'counts':
        // Get dashboard counts
        result = await dashboardService.getDashboardCounts()
        break
        
      case 'lifecycle':
        // Get documents needing attention
        result = await dashboardService.getDocumentsNeedingAttention()
        break
        
      case 'tasks':
        // Get assigned tasks for executive
        result = await dashboardService.getAssignedTasks(user.oid)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    // Log the dashboard access
    await auditService.createAuditEvent(
      'dashboard.accessed',
      user.upn,
      {
        section,
        userId: user.oid,
        userName: user.name
      },
      'dashboard_access_' + user.oid + '_' + Date.now(),
      'dms-core'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

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
    const { action } = body

    switch (action) {
      case 'createSiteLibrary':
        // Create a new site library
        const { siteCollection, libraryName, purpose, allowedAccessLevels, retentionPeriod } = body
        const siteUrl = await dashboardService.createSiteLibrary(
          siteCollection,
          libraryName,
          purpose,
          allowedAccessLevels || [],
          retentionPeriod || 365,
          user.oid
        )
        return NextResponse.json({ siteUrl })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Dashboard API POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
