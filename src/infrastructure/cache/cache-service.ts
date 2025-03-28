/**
 * Simple in-memory cache service
 */
export class CacheService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTtl: number;

  /**
   * Create a new cache service
   * @param ttlMs Default time-to-live in milliseconds (default: 30 minutes)
   */
  constructor(ttlMs: number = 30 * 60 * 1000) {
    this.defaultTtl = ttlMs;
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    const now = Date.now();
    
    if (now - item.timestamp > this.defaultTtl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMs Optional custom TTL in milliseconds
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const timestamp = Date.now();
    this.cache.set(key, { data, timestamp });
    
    if (ttlMs) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttlMs);
    }
  }

  /**
   * Remove a value from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }
}
