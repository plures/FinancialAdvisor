/**
 * Production Monitoring and Health Check Module
 * Provides observability and health monitoring for production deployments
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthStatus;
    aiProvider: HealthStatus;
    memory: HealthStatus;
    disk: HealthStatus;
  };
  timestamp: Date;
  uptime: number;
}

/** Status of an individual health check component (database, AI provider, memory, disk). */
export interface HealthStatus {
  status: 'ok' | 'warning' | 'error';
  message: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

/** A single named, time-stamped measurement emitted by the monitoring system. */
export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

/** Aggregated performance statistics for a monitoring window. */
export interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
}

/**
 * Production monitoring system
 */
export class ProductionMonitor {
  private metrics: MetricData[] = [];
  private responseTimes: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private startTime: Date;
  private readonly MAX_METRICS = 10000;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Perform comprehensive health check
   */
  async healthCheck(
    dbHealthFn?: () => Promise<boolean>,
    aiProviderHealthFn?: () => Promise<boolean>
  ): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(dbHealthFn),
      aiProvider: await this.checkAIProvider(aiProviderHealthFn),
      memory: this.checkMemory(),
      disk: this.checkDisk()
    };

    const allHealthy = Object.values(checks).every(c => c.status === 'ok');
    const anyError = Object.values(checks).some(c => c.status === 'error');

    return {
      status: anyError ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    });

    // Limit metrics array size
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Record request completion
   */
  recordRequest(responseTimeMs: number, isError: boolean = false): void {
    this.requestCount++;
    this.responseTimes.push(responseTimeMs);
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only recent response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Record metrics
    this.recordMetric('request.count', 1, 'count');
    this.recordMetric('request.response_time', responseTimeMs, 'ms');
    if (isError) {
      this.recordMetric('request.error', 1, 'count');
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const avgResponseTime = sortedTimes.length > 0
      ? sortedTimes.reduce((sum, t) => sum + t, 0) / sortedTimes.length
      : 0;

    // Calculate cache hit rate from metrics
    const cacheHits = this.metrics.filter(m => m.name === 'cache.hit').length;
    const cacheMisses = this.metrics.filter(m => m.name === 'cache.miss').length;
    const cacheHitRate = cacheHits + cacheMisses > 0
      ? cacheHits / (cacheHits + cacheMisses)
      : 0;

    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      averageResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }

  /**
   * Get metrics by name and time range
   */
  getMetrics(name: string, sinceMinutes: number = 60): MetricData[] {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - sinceMinutes);

    return this.metrics.filter(m => 
      m.name === name && m.timestamp >= cutoff
    );
  }

  /**
   * Get all metrics summary
   */
  getMetricsSummary(): Record<string, { count: number; sum: number; avg: number }> {
    const summary: Record<string, { count: number; sum: number; avg: number }> = {};

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, sum: 0, avg: 0 };
      }
      summary[metric.name].count++;
      summary[metric.name].sum += metric.value;
    }

    // Calculate averages
    for (const name in summary) {
      summary[name].avg = summary[name].sum / summary[name].count;
    }

    return summary;
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = [];
    this.responseTimes = [];
    this.errorCount = 0;
    this.requestCount = 0;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    const summary = this.getMetricsSummary();

    for (const [name, data] of Object.entries(summary)) {
      const metricName = `financialadvisor_${name.replace(/\./g, '_')}`;
      lines.push(`# HELP ${metricName} Financial Advisor metric: ${name}`);
      lines.push(`# TYPE ${metricName} gauge`);
      lines.push(`${metricName}_total ${data.sum}`);
      lines.push(`${metricName}_count ${data.count}`);
      lines.push(`${metricName}_avg ${data.avg}`);
    }

    return lines.join('\n');
  }

  // Private health check methods

  private async checkDatabase(healthFn?: () => Promise<boolean>): Promise<HealthStatus> {
    if (!healthFn) {
      return {
        status: 'warning',
        message: 'No database health check configured'
      };
    }

    const startTime = Date.now();
    try {
      const isHealthy = await healthFn();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'ok' : 'error',
        message: isHealthy ? 'Database is responding' : 'Database is not responding',
        responseTime
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown'}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkAIProvider(healthFn?: () => Promise<boolean>): Promise<HealthStatus> {
    if (!healthFn) {
      return {
        status: 'warning',
        message: 'No AI provider health check configured'
      };
    }

    const startTime = Date.now();
    try {
      const isHealthy = await healthFn();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'ok' : 'error',
        message: isHealthy ? 'AI provider is responding' : 'AI provider is not responding',
        responseTime
      };
    } catch (error) {
      return {
        status: 'error',
        message: `AI provider error: ${error instanceof Error ? error.message : 'Unknown'}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  private checkMemory(): HealthStatus {
    if (typeof process === 'undefined') {
      return {
        status: 'warning',
        message: 'Memory check not available in this environment'
      };
    }

    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    let status: 'ok' | 'warning' | 'error';
    if (usagePercent > 90) {
      status = 'error';
    } else if (usagePercent > 75) {
      status = 'warning';
    } else {
      status = 'ok';
    }

    return {
      status,
      message: `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
      details: {
        heapUsedMB,
        heapTotalMB,
        usagePercent: Math.round(usagePercent)
      }
    };
  }

  private checkDisk(): HealthStatus {
    // Disk check would require OS-specific implementation
    // For now, return a basic status
    return {
      status: 'ok',
      message: 'Disk space monitoring not implemented'
    };
  }
}

/**
 * Error logging and tracking
 */

/** A logged error entry with optional contextual metadata. */
export interface ErrorEntry {
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

/** In-memory error logger that retains up to 1 000 recent error entries for diagnostics. */
export class ErrorLogger {
  private errors: ErrorEntry[] = [];
  private readonly MAX_ERRORS = 1000;

  /**
   * Log an error
   */
  logError(error: Error, context?: Record<string, unknown>): void {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context
    });

    // Limit error log size
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }

    // In production, this would send to external logging service
    if (process.env.NODE_ENV === 'production') {
      console.error('[ERROR]', {
        message: error.message,
        stack: error.stack,
        context
      });
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): ErrorEntry[] {
    return this.errors.slice(-count);
  }

  /**
   * Get errors by time range
   */
  getErrorsByTimeRange(sinceMinutes: number = 60): ErrorEntry[] {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - sinceMinutes);

    return this.errors.filter(e => e.timestamp >= cutoff);
  }

  /**
   * Clear error log
   */
  clearErrors(): void {
    this.errors = [];
  }
}
