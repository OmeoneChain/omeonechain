type AppConfig = any;
export declare class EnvironmentConfig {
    static load(): AppConfig;
    private static getEnv;
    private static getPort;
    private static getDatabaseConfig;
    private static getRedisConfig;
    private static getIpfsConfig;
    private static getChainConfig;
    static isDevelopment(): boolean;
    static isProduction(): boolean;
    static getPrivateKey(): string | undefined;
}
export {};
