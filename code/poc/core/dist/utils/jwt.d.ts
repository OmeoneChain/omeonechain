export interface JWTPayload {
    userId: string;
    address: string;
    iat?: number;
    exp?: number;
}
export declare class JWTUtils {
    static generateToken(payload: JWTPayload): string;
    static generateRefreshToken(payload: JWTPayload): string;
    static verifyToken(token: string): JWTPayload;
    static extractTokenFromHeader(authHeader: string | undefined): string | null;
    static generateChallenge(address: string): {
        challenge: string;
        expires_at: Date;
    };
    static verifyChallenge(challenge: string, address: string): boolean;
    static createAuthMessage(challenge: string, address: string): string;
}
export declare class SignatureUtils {
    static verifyEthereumSignature(message: string, signature: string, address: string): boolean;
    static verifyWeb3Signature(message: string, signature: string, address: string): Promise<boolean>;
}
export interface UserRecord {
    id: string;
    address: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    verification_status: 'basic' | 'verified' | 'expert';
    created_at: Date;
    updated_at: Date;
}
export declare class UserManager {
    static findByAddress(address: string): UserRecord | null;
    static findById(id: string): UserRecord | null;
    static createUser(address: string): UserRecord;
    static updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null;
    static getUserStats(userId: string): {
        followers_count: number;
        following_count: number;
        recommendations_count: number;
        avg_trust_score: number;
    };
}
