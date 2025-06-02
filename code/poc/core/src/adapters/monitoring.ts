// code/poc/core/src/adapters/monitoring.ts

import { AdapterFactory } from './adapter-factory.js';
import { ProductionRebasedAdapter } from './production-rebased-adapter.js';
import { environmentManager } from '../config/index.js';

export interface MonitoringAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  component: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface HealthMetrics {
  timestamp: Date;
  adapter: {
    type: string;
    healthy: boolean;
    responseTime: number;
    successRate: number;
    totalRequests: number;
    failedRequests: number;
  };
  network: {
    name: string;
    chainId: string;
    blockHeight?: number;
    lastBlockTime?: Date;
  };
  system: {
    memoryUsage: number;
    cpuUsage?: number;
    cacheSize: number;
    activeConnections: number;
  };
}

export class AdapterMonitoring {
  private static instance: AdapterMonitoring;
  private alerts: MonitoringAlert[] = [];
  private metrics: HealthMetrics[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private alertCallbacks: Array<(alert: MonitoringAlert) => void> = [];
  private metricsCallbacks: Array<(metrics: HealthMetrics) => void> = [];
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): AdapterMonitoring {
    if (!AdapterMonitoring.instance) {
      AdapterMonitoring.instance = new AdapterMonitoring();
    }
    return AdapterMonitoring.instance;
  }

  /**
   * Start monitoring the adapter
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.log('📊 Monitoring already active');
      return;
    }

    console.log(`📊 Starting adapter monitoring (interval: ${intervalMs}ms)`);
    this.isMonitoring = true;

    // Initial metrics collection
    this.collectMetrics();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Log startup
    this.addAlert({
      severity: 'info',
      component: 'monitoring',
      message: 'Adapter monitoring started',
      metadata: { intervalMs },
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('📊 Stopping adapter monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.addAlert({
      severity: 'info',
      component: 'monitoring',
      message: 'Adapter monitoring stopped',
    });
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const factory = AdapterFactory.getInstance();
      const currentAdapter = factory.getCurrentAdapter();

      if (!currentAdapter) {
        this.addAlert({
          severity: 'warning',
          component: 'adapter',
          message: 'No adapter instance available for monitoring',
        });
        return;
      }

      const networkInfo = environmentManager.getNetworkInfo();
      const adapterHealth = await factory.getAdapterHealth();
      const adapterMetrics = factory.getAdapterMetrics();

      // Build metrics object
      const metrics: HealthMetrics = {
        timestamp: new Date(),
        adapter: {
          type: factory.getCurrentAdapterType(),
          healthy: adapterHealth.healthy,
          responseTime: 0,
          successRate: 100,
          totalRequests: 0,
          failedRequests: 0,
        },
        network: {
          name: networkInfo.name,
          chainId: networkInfo.chainId,
        },
        system: {
          memoryUsage: this.getMemoryUsage(),
          cacheSize: 0,
          activeConnections: 1,
        },
      };

      // Enhanced metrics for production adapter
      if (currentAdapter instanceof ProductionRebasedAdapter) {
        const perfMetrics = currentAdapter.getMetrics();
        const connectionStatus = currentAdapter.getConnectionStatus();

        metrics.adapter.responseTime = perfMetrics.averageResponseTime;
        metrics.adapter.successRate = perfMetrics.successRate;
        metrics.adapter.totalRequests = perfMetrics.totalRequests;
        metrics.adapter.failedRequests = perfMetrics.failedRequests;
        metrics.system.cacheSize = connectionStatus.cacheSize;
      }

      // Store metrics
      this.addMetrics(metrics);

      // Check for alerts
      this.checkForAlerts(metrics, adapterHealth);

      // Notify callbacks
      this.metricsCallbacks.forEach(callback => {
        try {
          callback(metrics);
        } catch (error) {
          console.error('Error in metrics callback:', error);
        }
      });

    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
      this.addAlert({
        severity: 'error',
        component: 'monitoring',
        message: 'Failed to collect metrics',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  /**
   * Check metrics for alert conditions
   */
  private checkForAlerts(metrics: HealthMetrics, adapterHealth: any): void {
    // Check adapter health
    if (!metrics.adapter.healthy) {
      this.addAlert({
        severity: 'error',
        component: 'adapter',
        message: 'Adapter health check failed',
        metadata: { details: adapterHealth.details },
      });
    }

    // Check success rate
    if (metrics.adapter.successRate < 95 && metrics.adapter.totalRequests > 10) {
      this.addAlert({
        severity: 'warning',
        component: 'adapter',
        message: `Low success rate: ${metrics.adapter.successRate.toFixed(1)}%`,
        metadata: { 
          successRate: metrics.adapter.successRate,
          totalRequests: metrics.adapter.totalRequests,
          failedRequests: metrics.adapter.failedRequests,
        },
      });
    }

    // Check response time
    if (metrics.adapter.responseTime > 5000) {
      this.addAlert({
        severity: 'warning',
        component: 'adapter',
        message: `High response time: ${metrics.adapter.responseTime.toFixed(0)}ms`,
        metadata: { responseTime: metrics.adapter.responseTime },
      });
    }

    // Check memory usage
    if (metrics.system.memoryUsage > 85) {
      this.addAlert({
        severity: 'warning',
        component: 'system',
        message: `High memory usage: ${metrics.system.memoryUsage.toFixed(1)}%`,
        metadata: { memoryUsage: metrics.system.memoryUsage },
      });
    }
  }

  /**
   * Add a new alert
   */
  private addAlert(alertData: Omit<MonitoringAlert, 'timestamp'>): void {
    const alert: MonitoringAlert = {
      ...alertData,
      timestamp: new Date(),
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log based on severity
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };

    console.log(`${emoji[alert.severity]} [${alert.component}] ${alert.message}`);

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  /**
   * Add metrics to history
   */
  private addMetrics(metrics: HealthMetrics): void {
    this.metrics.push(metrics);

    // Keep only last 24 hours of metrics (assuming 30s intervals = 2880 entries)
    if (this.metrics.length > 2880) {
      this.metrics = this.metrics.slice(-2880);
    }
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    const used = process.memoryUsage();
    const total = used.heapTotal + used.external + used.arrayBuffers;
    const usage = (used.heapUsed / total) * 100;
    return Math.round(usage * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: MonitoringAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Subscribe to metrics updates
   */
  onMetrics(callback: (metrics: HealthMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 10): MonitoringAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: MonitoringAlert['severity']): MonitoringAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): HealthMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get metrics summary for a time period
   */
  getMetricsSummary(periodMinutes: number = 60): {
    period: { start: Date; end: Date };
    adapter: {
      averageResponseTime: number;
      averageSuccessRate: number;
      totalRequests: number;
      healthyPercentage: number;
    };
    system: {
      averageMemoryUsage: number;
      averageCacheSize: number;
    };
    alerts: {
      total: number;
      byEvent: Record<string, number>;
    };
  } {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodMinutes * 60 * 1000);

    const periodMetrics = this.metrics.filter(m => m.timestamp >= startTime);
    const periodAlerts = this.alerts.filter(a => a.timestamp >= startTime);

    if (periodMetrics.length === 0) {
      return {
        period: { start: startTime, end: now },
        adapter: { averageResponseTime: 0, averageSuccessRate: 0, totalRequests: 0, healthyPercentage: 0 },
        system: { averageMemoryUsage: 0, averageCacheSize: 0 },
        alerts: { total: 0, byEvent: {} },
      };
    }

    // Calculate adapter metrics
    const avgResponseTime = periodMetrics.reduce((sum, m) => sum + m.adapter.responseTime, 0) / periodMetrics.length;
    const avgSuccessRate = periodMetrics.reduce((sum, m) => sum + m.adapter.successRate, 0) / periodMetrics.length;
    const totalRequests = periodMetrics[periodMetrics.length - 1].adapter.totalRequests - periodMetrics[0].adapter.totalRequests;
    const healthyCount = periodMetrics.filter(m => m.adapter.healthy).length;
    const healthyPercentage = (healthyCount / periodMetrics.length) * 100;

    // Calculate system metrics
    const avgMemoryUsage = periodMetrics.reduce((sum, m) => sum + m.system.memoryUsage, 0) / periodMetrics.length;
    const avgCacheSize = periodMetrics.reduce((sum, m) => sum + m.system.cacheSize, 0) / periodMetrics.length;

    // Calculate alert summary
    const alertsByEvent: Record<string, number> = {};
    periodAlerts.forEach(alert => {
      const key = `${alert.severity}:${alert.component}`;
      alertsByEvent[key] = (alertsByEvent[key] || 0) + 1;
    });

    return {
      period: { start: startTime, end: now },
      adapter: {
        averageResponseTime: Math.round(avgResponseTime),
        averageSuccessRate: Math.round(avgSuccessRate * 10) / 10,
        totalRequests,
        healthyPercentage: Math.round(healthyPercentage * 10) / 10,
      },
      system: {
        averageMemoryUsage: Math.round(avgMemoryUsage * 10) / 10,
        averageCacheSize: Math.round(avgCacheSize),
      },
      alerts: {
        total: periodAlerts.length,
        byEvent: alertsByEvent,
      },
    };
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    export: {
      timestamp: Date;
      environment: string;
      alerts: MonitoringAlert[];
      metrics: HealthMetrics[];
      summary: ReturnType<typeof this.getMetricsSummary>;
    };
  } {
    return {
      export: {
        timestamp: new Date(),
        environment: environmentManager.getCurrentEnvironment(),
        alerts: this.alerts,
        metrics: this.metrics,
        summary: this.getMetricsSummary(60), // Last hour summary
      },
    };
  }

  /**
   * Clear monitoring data
   */
  clearData(): void {
    this.alerts = [];
    this.metrics = [];
    console.log('🗑️ Monitoring data cleared');
  }

  /**
   * Generate health report
   */
  generateHealthReport(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    summary: string;
    details: {
      adapter: any;
      network: any;
      alerts: { recent: number; critical: number; errors: number };
      recommendations: string[];
    };
  } {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const recentAlerts = this.getRecentAlerts(20);
    const criticalAlerts = this.getAlertsBySeverity('critical').length;
    const errorAlerts = this.getAlertsBySeverity('error').length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const recommendations: string[] = [];

    if (!latestMetrics) {
      status = 'unhealthy';
      recommendations.push('No metrics available - ensure monitoring is active');
    } else {
      // Check adapter health
      if (!latestMetrics.adapter.healthy) {
        status = 'unhealthy';
        recommendations.push('Adapter health check failing - check network connectivity');
      } else if (latestMetrics.adapter.successRate < 95) {
        status = 'degraded';
        recommendations.push('Low success rate - investigate network issues');
      }

      // Check response time
      if (latestMetrics.adapter.responseTime > 5000) {
        if (status === 'healthy') status = 'degraded';
        recommendations.push('High response time - consider connection optimization');
      }

      // Check alerts
      if (criticalAlerts > 0) {
        status = 'unhealthy';
        recommendations.push('Critical alerts detected - immediate attention required');
      } else if (errorAlerts > 0) {
        if (status === 'healthy') status = 'degraded';
        recommendations.push('Error alerts detected - investigate and resolve');
      }

      // Memory usage
      if (latestMetrics.system.memoryUsage > 85) {
        if (status === 'healthy') status = 'degraded';
        recommendations.push('High memory usage - consider optimization or scaling');
      }
    }

    return {
      status,
      timestamp: new Date(),
      summary: this.getStatusSummary(status, latestMetrics),
      details: {
        adapter: latestMetrics?.adapter || null,
        network: latestMetrics?.network || null,
        alerts: {
          recent: recentAlerts.length,
          critical: criticalAlerts,
          errors: errorAlerts,
        },
        recommendations,
      },
    };
  }

  private getStatusSummary(status: string, metrics?: HealthMetrics): string {
    if (!metrics) {
      return 'No metrics available for health assessment';
    }

    const successRate = metrics.adapter.successRate.toFixed(1);
    const responseTime = Math.round(metrics.adapter.responseTime);
    const memoryUsage = metrics.system.memoryUsage.toFixed(1);

    switch (status) {
      case 'healthy':
        return `System operating normally: ${successRate}% success rate, ${responseTime}ms avg response time`;
      case 'degraded':
        return `System experiencing issues: ${successRate}% success rate, ${responseTime}ms avg response time, ${memoryUsage}% memory usage`;
      case 'unhealthy':
        return `System requires attention: ${successRate}% success rate, ${responseTime}ms avg response time`;
      default:
        return 'Unknown system status';
    }
  }
}

// Convenience functions
export function startMonitoring(intervalMs?: number): void {
  AdapterMonitoring.getInstance().startMonitoring(intervalMs);
}

export function stopMonitoring(): void {
  AdapterMonitoring.getInstance().stopMonitoring();
}

export function getMonitoringInstance(): AdapterMonitoring {
  return AdapterMonitoring.getInstance();
}