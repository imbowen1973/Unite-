// SharePoint API Utilities for Unite Platform
import { TokenPayload } from '@/lib/auth'

interface SharePointConfig {
  tenantUrl: string
  clientId: string
  clientSecret: string
  siteId: string
}

interface SharePointFile {
  id: string
  name: string
  webUrl: string
  size: number
  createdBy: {
    user: {
      displayName: string
      email: string
    }
  }
  createdDateTime: string
  lastModifiedDateTime: string
  docStableId?: string // Our custom property for permanent reference
}

interface SharePointList {
  id: string
  name: string
  displayName: string
  description?: string
}

interface SharePointListItem {
  id: string
  fields: Record<string, any>
}

export class SharePointService {
  private config: SharePointConfig
  private accessToken: string | null = null

  constructor(config: SharePointConfig) {
    this.config = config
  }

  // Get access token for service account using client credentials flow
  async getServiceAccountToken(): Promise<string> {
    const tokenUrl = 'https://login.microsoftonline.com/' + this.config.tenantUrl + '/oauth2/v2.0/token'
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'https://graph.microsoft.com/.default', // Graph API scope
      }).toString(),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to get access token: ' + error.error_description)
    }
    
    const data = await response.json()
    this.accessToken = data.access_token
    return data.access_token
  }

  // Ensure we have a valid access token
  private async ensureAccessToken(): Promise<string> {
    if (!this.accessToken) {
      return this.getServiceAccountToken()
    }
    // In a real implementation, we would check if the token is expired
    // For now, we'll just return the existing token
    return this.accessToken
  }

  // Upload a file to SharePoint
  async uploadFile(
    fileName: string, 
    fileContent: Buffer | ArrayBuffer, 
    folderPath?: string,
    docStableId?: string  // Our custom property for permanent reference
  ): Promise<SharePointFile> {
    const token = await this.ensureAccessToken()
    const folderPathPart = folderPath ? ':' + folderPath + ':' : ''
    
    const uploadUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/drive/root' + folderPathPart + ':/' + fileName + ':/content'
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/octet-stream',
      },
      body: fileContent,
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to upload file: ' + JSON.stringify(error))
    }
    
    const fileData = await response.json()
    
    // If we have a docStableId, set it as a field property
    if (docStableId) {
      await this.updateFileProperties(fileData.id, { docStableId })
    }
    
    return fileData as SharePointFile
  }

  // Update file properties including our custom docStableId
  async updateFileProperties(fileId: string, properties: Record<string, any>): Promise<void> {
    const token = await this.ensureAccessToken()
    
    const updateUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/drive/items/' + fileId + '/fields'
    
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(properties),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to update file properties: ' + JSON.stringify(error))
    }
  }

  // Download a file from SharePoint
  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    const token = await this.ensureAccessToken()
    
    const downloadUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/drive/items/' + fileId + '/content'
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to download file: ' + JSON.stringify(error))
    }
    
    return await response.arrayBuffer()
  }

  // Get file by docStableId (our custom property)
  async getFileByDocStableId(docStableId: string): Promise<SharePointFile | null> {
    const token = await this.ensureAccessToken()
    
    // Search for files with the specific docStableId property
    const searchUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/drive/root/search(q=\'' + docStableId + '\')'
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to search for file: ' + JSON.stringify(error))
    }
    
    const searchData = await response.json()
    
    // Look for the file with matching docStableId in the results
    if (searchData.value && Array.isArray(searchData.value)) {
      for (const item of searchData.value) {
        if (item.docStableId === docStableId) {
          return item as SharePointFile
        }
      }
    }
    
    return null
  }

  // Get file by ID
  async getFileById(fileId: string): Promise<SharePointFile> {
    const token = await this.ensureAccessToken()
    
    const fileUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/drive/items/' + fileId
    
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to get file: ' + JSON.stringify(error))
    }
    
    return await response.json() as SharePointFile
  }

  // Create a SharePoint list
  async createList(listInfo: Partial<SharePointList>): Promise<SharePointList> {
    const token = await this.ensureAccessToken()
    
    const listUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/lists'
    
    const response = await fetch(listUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: listInfo.displayName,
        list: {
          template: 'genericList'
        },
        description: listInfo.description
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to create list: ' + JSON.stringify(error))
    }
    
    return await response.json() as SharePointList
  }

  // Add item to a SharePoint list
  async addListItem(listId: string, fields: Record<string, any>): Promise<SharePointListItem> {
    const token = await this.ensureAccessToken()
    
    const itemUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/lists/' + listId + '/items'
    
    const response = await fetch(itemUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: fields
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to add list item: ' + JSON.stringify(error))
    }
    
    return await response.json() as SharePointListItem
  }

  // Update item in a SharePoint list
  async updateListItem(listId: string, itemId: string, fields: Record<string, any>): Promise<SharePointListItem> {
    const token = await this.ensureAccessToken()
    
    const itemUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/lists/' + listId + '/items/' + itemId
    
    const response = await fetch(itemUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: fields
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to update list item: ' + JSON.stringify(error))
    }
    
    return await response.json() as SharePointListItem
  }

  // Get items from a SharePoint list
  async getListItems(listId: string, top: number = 100): Promise<SharePointListItem[]> {
    const token = await this.ensureAccessToken()
    
    const itemsUrl = 'https://graph.microsoft.com/v1.0/sites/' + this.config.siteId + '/lists/' + listId + '/items?=' + top
    
    const response = await fetch(itemsUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to get list items: ' + JSON.stringify(error))
    }
    
    const data = await response.json()
    return data.value as SharePointListItem[]
  }
}
