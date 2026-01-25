/**
 * Performance Optimization Module
 * Provides caching, batching, and rate limiting for AI operations
 */

import type { Transaction } from '@financialadvisor/shared';

export interface BatchProcessingOptions {
  batchSize: number;
  delayBetweenBatches: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, item: any) => void;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Request queue item for rate limiting
 */
interface QueuedRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

/**
 * Performance optimizer for AI operations
 */
export class PerformanceOptimizer {
  private requestQueue: QueuedRequest[] = [];
  private requestTimestamps: number[] = [];
  private isProcessingQueue = false;
  private rateLimitConfig: RateLimitConfig;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(rateLimitConfig?: RateLimitConfig) {
    this.rateLimitConfig = rateLimitConfig || {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burstSize: 10
    };
  }

  /**
   * Process transactions in batches to avoid overwhelming the AI provider
   */
  async batchProcessTransactions<T>(
    items: Transaction[],
    processor: (item: Transaction) => Promise<T>,
    options: BatchProcessingOptions
  ): Promise<T[]> {
    const results: T[] = [];
    const batches = this.createBatches(items, options.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else if (options.onError) {
          options.onError(result.reason, batch);
        }
      }

      if (options.onProgress) {
        options.onProgress((i + 1) * options.batchSize, items.length);
      }

      // Delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await this.delay(options.delayBetweenBatches);
      }
    }

    return results;
  }

  /**
   * Execute request with rate limiting
   */
  async executeWithRateLimit<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: request,
        resolve,
        reject,
        timestamp: Date.now()
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(cacheSize: number): CacheStats {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: cacheSize,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Optimize context data for AI processing
   */
  optimizeContext(context: any, maxSize: number = 4000): any {
    const serialized = JSON.stringify(context);
    
    if (serialized.length <= maxSize) {
      return context;
    }

    // Reduce transaction count if needed
    const optimized = { ...context };
    if (optimized.transactions && optimized.transactions.length > 50) {
      // Keep most recent transactions
      optimized.transactions = optimized.transactions
        .sort((a: Transaction, b: Transaction) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, 50);
    }

    // Reduce account details if needed
    if (optimized.accounts) {
      optimized.accounts = optimized.accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: acc.balance
      }));
    }

    return optimized;
  }

  /**
   * Deduplicate similar requests
   */
  deduplicateRequests<T>(
    requests: Array<{ key: string; fn: () => Promise<T> }>
  ): Promise<Map<string, T>> {
    const uniqueKeys = new Set(requests.map(r => r.key));
    const uniqueRequests = new Map<string, () => Promise<T>>();

    for (const request of requests) {
      if (!uniqueRequests.has(request.key)) {
        uniqueRequests.set(request.key, request.fn);
      }
    }

    return Promise.all(
      Array.from(uniqueRequests.entries()).map(async ([key, fn]) => {
        const result = await fn();
        return [key, result] as [string, T];
      })
    ).then(results => new Map(results));
  }

  /**
   * Implement connection pooling for API clients
   */
  createConnectionPool<T>(
    factory: () => T,
    poolSize: number = 5
  ): ConnectionPool<T> {
    return new ConnectionPool(factory, poolSize);
  }

  // Private helper methods

  private async processQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      
      // Clean old timestamps
      this.requestTimestamps = this.requestTimestamps.filter(
        ts => now - ts < 60000 // Keep last minute
      );

      // Check rate limits
      if (!this.canMakeRequest()) {
        await this.delay(1000); // Wait 1 second before retry
        continue;
      }

      const request = this.requestQueue.shift();
      if (!request) continue;

      this.requestTimestamps.push(now);

      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const requestsLastMinute = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
    const requestsLastHour = this.requestTimestamps.filter(ts => ts > oneHourAgo).length;

    if (requestsLastMinute >= this.rateLimitConfig.requestsPerMinute) {
      return false;
    }

    if (requestsLastHour >= this.rateLimitConfig.requestsPerHour) {
      return false;
    }

    return true;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Connection pool for managing API client instances
 */
export class ConnectionPool<T> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, maxSize: number) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<T> {
    // Try to get an available connection
    const available = this.pool.find(conn => !this.inUse.has(conn));
    if (available) {
      this.inUse.add(available);
      return available;
    }

    // Create new connection if under limit
    if (this.pool.length < this.maxSize) {
      const newConn = this.factory();
      this.pool.push(newConn);
      this.inUse.add(newConn);
      return newConn;
    }

    // Wait for a connection to become available
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const available = this.pool.find(conn => !this.inUse.has(conn));
        if (available) {
          clearInterval(checkInterval);
          this.inUse.add(available);
          resolve(available);
        }
      }, 100);
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: T): void {
    this.inUse.delete(connection);
  }

  /**
   * Execute function with automatic acquire/release
   */
  async execute<R>(fn: (connection: T) => Promise<R>): Promise<R> {
    const connection = await this.acquire();
    try {
      return await fn(connection);
    } finally {
      this.release(connection);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      total: this.pool.length,
      inUse: this.inUse.size,
      available: this.pool.length - this.inUse.size
    };
  }
}
