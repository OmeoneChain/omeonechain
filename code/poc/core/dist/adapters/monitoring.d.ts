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
export declare class AdapterMonitoring {
    private static instance;
    private alerts;
    private metrics;
    private monitoringInterval?;
    private alertCallbacks;
    private metricsCallbacks;
    private isMonitoring;
    private constructor();
    static getInstance(): AdapterMonitoring;
    /**
     * Start monitoring the adapter
     */
    startMonitoring(intervalMs?: number): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Collect current metrics
     */
    private collectMetrics;
    /**
     * Check metrics for alert conditions
     */
    private checkForAlerts;
    /**
     * Add a new alert
     */
    private addAlert;
    /**
     * Add metrics to history
     */
    private addMetrics;
    /**
     * Get memory usage percentage
     */
    private getMemoryUsage;
    /**
     * Subscribe to alerts
     */
    onAlert(callback: (alert: MonitoringAlert) => void): void;
    /**
     * Subscribe to metrics updates
     */
    onMetrics(callback: (metrics: HealthMetrics) => void): void;
    /**
     * Get recent alerts
     */
    getRecentAlerts(count?: number): MonitoringAlert[];
    /**
     * Get alerts by severity
     */
    getAlertsBySeverity(severity: MonitoringAlert['severity']): MonitoringAlert[];
    /**
     * Get recent metrics
     */
    getRecentMetrics(count?: number): HealthMetrics[];
    /**
     * Get metrics summary for a time period
     */
    getMetricsSummary(periodMinutes?: number): {
        period: {
            start: Date;
            end: Date;
        };
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
    };
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
    };
    /**
     * Clear monitoring data
     */
    clearData(): void;
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
            alerts: {
                recent: number;
                critical: number;
                errors: number;
            };
            recommendations: string[];
        };
    };
    private getStatusSummary;
}
export declare function startMonitoring(intervalMs?: number): void;
export declare function stopMonitoring(): void;
export declare function getMonitoringInstance(): AdapterMonitoring;
