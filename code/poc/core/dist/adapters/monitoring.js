"use strict";
// code/poc/core/src/adapters/monitoring.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterMonitoring = void 0;
exports.startMonitoring = startMonitoring;
exports.stopMonitoring = stopMonitoring;
exports.getMonitoringInstance = getMonitoringInstance;
const adapter_factory_js_1 = require("./adapter-factory.js");
const production_rebased_adapter_js_1 = require("./production-rebased-adapter.js");
const index_js_1 = require("../config/index.js");
class AdapterMonitoring {
    constructor() {
        this.alerts = [];
        this.metrics = [];
        this.alertCallbacks = [];
        this.metricsCallbacks = [];
        this.isMonitoring = false;
    }
    static getInstance() {
        if (!AdapterMonitoring.instance) {
            AdapterMonitoring.instance = new AdapterMonitoring();
        }
        return AdapterMonitoring.instance;
    }
    /**
     * Start monitoring the adapter
     */
    startMonitoring(intervalMs = 30000) {
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
    stopMonitoring() {
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
    async collectMetrics() {
        try {
            const factory = adapter_factory_js_1.AdapterFactory.getInstance();
            const currentAdapter = factory.getCurrentAdapter();
            if (!currentAdapter) {
                this.addAlert({
                    severity: 'warning',
                    component: 'adapter',
                    message: 'No adapter instance available for monitoring',
                });
                return;
            }
            const networkInfo = index_js_1.environmentManager.getNetworkInfo();
            const adapterHealth = await factory.getAdapterHealth();
            const adapterMetrics = factory.getAdapterMetrics();
            // Build metrics object
            const metrics = {
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
            if (currentAdapter instanceof production_rebased_adapter_js_1.ProductionRebasedAdapter) {
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
                }
                catch (error) {
                    console.error('Error in metrics callback:', error);
                }
            });
        }
        catch (error) {
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
    checkForAlerts(metrics, adapterHealth) {
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
    addAlert(alertData) {
        const alert = {
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
            }
            catch (error) {
                console.error('Error in alert callback:', error);
            }
        });
    }
    /**
     * Add metrics to history
     */
    addMetrics(metrics) {
        this.metrics.push(metrics);
        // Keep only last 24 hours of metrics (assuming 30s intervals = 2880 entries)
        if (this.metrics.length > 2880) {
            this.metrics = this.metrics.slice(-2880);
        }
    }
    /**
     * Get memory usage percentage
     */
    getMemoryUsage() {
        const used = process.memoryUsage();
        const total = used.heapTotal + used.external + used.arrayBuffers;
        const usage = (used.heapUsed / total) * 100;
        return Math.round(usage * 10) / 10; // Round to 1 decimal place
    }
    /**
     * Subscribe to alerts
     */
    onAlert(callback) {
        this.alertCallbacks.push(callback);
    }
    /**
     * Subscribe to metrics updates
     */
    onMetrics(callback) {
        this.metricsCallbacks.push(callback);
    }
    /**
     * Get recent alerts
     */
    getRecentAlerts(count = 10) {
        return this.alerts.slice(-count);
    }
    /**
     * Get alerts by severity
     */
    getAlertsBySeverity(severity) {
        return this.alerts.filter(alert => alert.severity === severity);
    }
    /**
     * Get recent metrics
     */
    getRecentMetrics(count = 10) {
        return this.metrics.slice(-count);
    }
    /**
     * Get metrics summary for a time period
     */
    getMetricsSummary(periodMinutes = 60) {
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
        const alertsByEvent = {};
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
    exportData() {
        return {
            export: {
                timestamp: new Date(),
                environment: index_js_1.environmentManager.getCurrentEnvironment(),
                alerts: this.alerts,
                metrics: this.metrics,
                summary: this.getMetricsSummary(60), // Last hour summary
            },
        };
    }
    /**
     * Clear monitoring data
     */
    clearData() {
        this.alerts = [];
        this.metrics = [];
        console.log('🗑️ Monitoring data cleared');
    }
    /**
     * Generate health report
     */
    generateHealthReport() {
        const latestMetrics = this.metrics[this.metrics.length - 1];
        const recentAlerts = this.getRecentAlerts(20);
        const criticalAlerts = this.getAlertsBySeverity('critical').length;
        const errorAlerts = this.getAlertsBySeverity('error').length;
        let status = 'healthy';
        const recommendations = [];
        if (!latestMetrics) {
            status = 'unhealthy';
            recommendations.push('No metrics available - ensure monitoring is active');
        }
        else {
            // Check adapter health
            if (!latestMetrics.adapter.healthy) {
                status = 'unhealthy';
                recommendations.push('Adapter health check failing - check network connectivity');
            }
            else if (latestMetrics.adapter.successRate < 95) {
                status = 'degraded';
                recommendations.push('Low success rate - investigate network issues');
            }
            // Check response time
            if (latestMetrics.adapter.responseTime > 5000) {
                if (status === 'healthy')
                    status = 'degraded';
                recommendations.push('High response time - consider connection optimization');
            }
            // Check alerts
            if (criticalAlerts > 0) {
                status = 'unhealthy';
                recommendations.push('Critical alerts detected - immediate attention required');
            }
            else if (errorAlerts > 0) {
                if (status === 'healthy')
                    status = 'degraded';
                recommendations.push('Error alerts detected - investigate and resolve');
            }
            // Memory usage
            if (latestMetrics.system.memoryUsage > 85) {
                if (status === 'healthy')
                    status = 'degraded';
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
    getStatusSummary(status, metrics) {
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
exports.AdapterMonitoring = AdapterMonitoring;
// Convenience functions
function startMonitoring(intervalMs) {
    AdapterMonitoring.getInstance().startMonitoring(intervalMs);
}
function stopMonitoring() {
    AdapterMonitoring.getInstance().stopMonitoring();
}
function getMonitoringInstance() {
    return AdapterMonitoring.getInstance();
}
//# sourceMappingURL=monitoring.js.map