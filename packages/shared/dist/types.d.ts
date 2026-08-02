export declare const VAULT_TYPES: readonly ["login", "password", "note", "card", "identity", "apiKey", "secret", "journal", "address", "contact"];
export type VaultType = (typeof VAULT_TYPES)[number];
export declare const FILE_KINDS: readonly ["image", "video", "document", "zip", "other"];
export type FileKind = (typeof FILE_KINDS)[number];
export interface User {
    _id: string;
    email: string;
    name?: string;
    kekSalt: string;
    authSalt: string;
    iterations: number;
    wrappedDEK: string;
    twoFactor: {
        enabled: boolean;
        pending?: boolean;
        secretEnc?: string;
        backupCodes?: string[];
    };
    settings: {
        theme: 'light' | 'dark' | 'system';
        language: string;
        notifications: boolean;
    };
    createdAt: string;
    updatedAt: string;
}
export interface VaultEntry {
    _id: string;
    userId: string;
    type: VaultType;
    encrypted: string;
    iv: string;
    folderId?: string | null;
    tags: string[];
    favorite: boolean;
    pinned: boolean;
    archived: boolean;
    deletedAt?: string | null;
    title: string;
    updatedAt: string;
    createdAt: string;
}
/** The plaintext shape (client side) that is JSON.stringify'd + AES encrypted per entry. */
export interface VaultItem {
    id?: string;
    title: string;
    fields: Record<string, string | string[]>;
    note?: string;
    attachments?: string[];
}
export interface Folder {
    _id: string;
    userId: string;
    name: string;
    type: VaultType | 'all';
    color: string;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface Album {
    _id: string;
    userId: string;
    name: string;
    createdAt: string;
}
export interface FileEntry {
    _id: string;
    userId: string;
    fsId: string;
    kind: FileKind;
    mime: string;
    size: number;
    encryptedName: string;
    iv: string;
    contentIv: string;
    albumId?: string | null;
    tags: string[];
    favorite: boolean;
    deletedAt?: string | null;
    createdAt: string;
}
export interface SessionInfo {
    _id: string;
    userId: string;
    tokenHash: string;
    deviceId: string;
    deviceName: string;
    ua: string;
    ip: string;
    trusted: boolean;
    current?: boolean;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
}
export interface DeviceInfo {
    _id: string;
    userId: string;
    name: string;
    platform: string;
    fingerprint: string;
    trusted: boolean;
    verified: boolean;
    lastSeenAt: string;
    createdAt: string;
}
export interface AuditLog {
    _id: string;
    userId: string;
    action: string;
    ip?: string;
    ua?: string;
    createdAt: string;
}
export interface AuthEvent {
    _id: string;
    userId?: string;
    email?: string;
    type: 'login' | 'register' | 'failed' | 'logout' | '2fa';
    ip?: string;
    ua?: string;
    createdAt: string;
}
export interface Notification {
    _id: string;
    userId: string;
    title: string;
    body: string;
    type: string;
    read: boolean;
    createdAt: string;
}
export interface Backup {
    _id: string;
    userId: string;
    fsId?: string;
    filename: string;
    size: number;
    kind: 'auto' | 'manual' | 'export';
    restoredAt?: string | null;
    createdAt: string;
}
export interface TrashEntry {
    _id: string;
    type: 'vault' | 'file';
    itemId: string;
    title: string;
    deletedAt: string;
}
export interface StatsOverview {
    totalItems: number;
    byType: Record<VaultType, number>;
    filesCount: number;
    storageUsedBytes: number;
    recentItems: Array<Pick<VaultEntry, '_id' | 'type' | 'title' | 'updatedAt'>>;
    security: SecurityOverview;
}
export interface SecurityOverview {
    score: number;
    twoFactorEnabled: boolean;
    activeSessions: number;
    trustedDevices: number;
    weakPasswords: number;
    duplicatePasswords: number;
    totalLogins: number;
    recentLogins: AuthEvent[];
    passwordHealth: PasswordHealth;
}
export interface PasswordHealth {
    total: number;
    weak: number;
    duplicate: number;
    reused: number;
    breached: number;
}
export interface PasswordEntry {
    id: string;
    title: string;
    username: string;
    password: string;
    url?: string;
    strength: number;
}
