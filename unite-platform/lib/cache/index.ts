// Vercel KV Cache Utilities for Unite Platform
import { kv } from '@vercel/kv'

export interface CacheConfig {
  ttl?: number // Time to live in seconds
}

export class CacheService {
  // Default TTL is 1 hour (3600 seconds)
  private defaultTtl: number = 3600

  constructor(config?: CacheConfig) {
    if (config?.ttl) {
      this.defaultTtl = config.ttl
    }
  }

  // Get a value from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await kv.get<T>(key)
      return value
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  // Set a value in cache
  async set<T>(key: string, value: T, ttl: number = this.defaultTtl): Promise<void> {
    try {
      await kv.set(key, value, { ex: ttl })
    } catch (error) {
      console.error('Cache set error:', error)
      throw error
    }
  }

  // Delete a value from cache
  async delete(key: string): Promise<boolean> {
    try {
      await kv.del(key)
      return true
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  // Check if a key exists in cache
  async exists(key: string): Promise<boolean> {
    try {
      const result = await kv.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  // Increment a counter in cache
  async increment(key: string, value: number = 1, ttl: number = this.defaultTtl): Promise<number> {
    try {
      // Use pipeline to ensure atomic operation
      const pipeline = kv.pipeline()
      pipeline.incrby(key, value)
      pipeline.expire(key, ttl)
      const results = await pipeline.exec()
      // Return the increment result (first operation)
      return results[0] as number
    } catch (error) {
      console.error('Cache increment error:', error)
      throw error
    }
  }

  // Decrement a counter in cache
  async decrement(key: string, value: number = 1, ttl: number = this.defaultTtl): Promise<number> {
    try {
      // Use pipeline to ensure atomic operation
      const pipeline = kv.pipeline()
      pipeline.decrby(key, value)
      pipeline.expire(key, ttl)
      const results = await pipeline.exec()
      // Return the decrement result (first operation)
      return results[0] as number
    } catch (error) {
      console.error('Cache decrement error:', error)
      throw error
    }
  }

  // Get multiple values from cache
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await kv.mget<T>(...keys)
      return values
    } catch (error) {
      console.error('Cache mget error:', error)
      return keys.map(() => null)
    }
  }

  // Set multiple values in cache
  async mset(...keyValuePairs: [string, any][]): Promise<void> {
    try {
      const pairs: [string, any][] = []
      for (const [key, value] of keyValuePairs) {
        pairs.push([key, value])
      }
      await kv.mset(...pairs)
    } catch (error) {
      console.error('Cache mset error:', error)
      throw error
    }
  }
}

// Specific caching utilities for Unite Platform
export class UniteCacheService extends CacheService {
  // Cache for dashboard counters to avoid SharePoint throttling
  async getDashboardCount(key: string, userId: string): Promise<number> {
    // Include user ID to prevent cache poisoning
    const cached = await this.get<number>(`dashboard:${userId}:${key}`)
    return cached || 0
  }

  async setDashboardCount(key: string, userId: string, value: number): Promise<void> {
    // Include user ID to prevent cache poisoning
    await this.set(`dashboard:${userId}:${key}`, value, 300) // 5 minutes TTL for dashboard counts
  }

  async incrementDashboardCount(key: string, userId: string): Promise<number> {
    // Include user ID to prevent cache poisoning
    return await this.increment(`dashboard:${userId}:${key}`, 1, 300) // 5 minutes TTL
  }

  async decrementDashboardCount(key: string, userId: string): Promise<number> {
    // Include user ID to prevent cache poisoning
    return await this.decrement(`dashboard:${userId}:${key}`, 1, 300) // 5 minutes TTL
  }

  // Cache for document lookups by docStableId (global, not user-specific)
  async getDocStableIdCache(docStableId: string): Promise<string | null> {
    return await this.get<string>('doc:' + docStableId)
  }

  async setDocStableIdCache(docStableId: string, sharepointFileId: string): Promise<void> {
    await this.set('doc:' + docStableId, sharepointFileId, 1800) // 30 minutes TTL
  }

  // Cache for user permissions
  async getUserPermissionsCache(userId: string, tenantId?: string): Promise<string[]> {
    // Include tenant ID for multi-tenant scenarios
    const cacheKey = tenantId ? `permissions:${tenantId}:${userId}` : `permissions:${userId}`
    const cached = await this.get<string[]>(cacheKey)
    return cached || []
  }

  async setUserPermissionsCache(userId: string, permissions: string[], tenantId?: string): Promise<void> {
    // Include tenant ID for multi-tenant scenarios
    const cacheKey = tenantId ? `permissions:${tenantId}:${userId}` : `permissions:${userId}`
    await this.set(cacheKey, permissions, 900) // 15 minutes TTL
  }

  // Cache for audit verification results (system-wide, not user-specific)
  async getAuditVerificationCache(key: string): Promise<boolean | null> {
    return await this.get<boolean>('audit-verify:' + key)
  }

  async setAuditVerificationCache(key: string, result: boolean): Promise<void> {
    await this.set('audit-verify:' + key, result, 600) // 10 minutes TTL
  }
}
