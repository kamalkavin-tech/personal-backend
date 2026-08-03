import { z } from 'zod';
export declare const emailSchema: z.ZodString;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    masterPassword: z.ZodOptional<z.ZodString>;
    kekSalt: z.ZodString;
    authSalt: z.ZodString;
    iterations: z.ZodNumber;
    wrappedDEK: z.ZodString;
    authKey: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
    deviceName: z.ZodOptional<z.ZodString>;
    platform: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    kekSalt: string;
    authSalt: string;
    iterations: number;
    wrappedDEK: string;
    authKey: string;
    name?: string | undefined;
    masterPassword?: string | undefined;
    deviceId?: string | undefined;
    deviceName?: string | undefined;
    platform?: string | undefined;
}, {
    email: string;
    kekSalt: string;
    authSalt: string;
    iterations: number;
    wrappedDEK: string;
    authKey: string;
    name?: string | undefined;
    masterPassword?: string | undefined;
    deviceId?: string | undefined;
    deviceName?: string | undefined;
    platform?: string | undefined;
}>;
export declare const prepareLoginSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    authKey: z.ZodString;
    twoFactorCode: z.ZodOptional<z.ZodString>;
    rememberDevice: z.ZodOptional<z.ZodBoolean>;
    deviceId: z.ZodOptional<z.ZodString>;
    deviceName: z.ZodOptional<z.ZodString>;
    platform: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    authKey: string;
    deviceId?: string | undefined;
    deviceName?: string | undefined;
    platform?: string | undefined;
    twoFactorCode?: string | undefined;
    rememberDevice?: boolean | undefined;
}, {
    email: string;
    authKey: string;
    deviceId?: string | undefined;
    deviceName?: string | undefined;
    platform?: string | undefined;
    twoFactorCode?: string | undefined;
    rememberDevice?: boolean | undefined;
}>;
export declare const verify2faSchema: z.ZodObject<{
    email: z.ZodString;
    authKey: z.ZodString;
    twoFactorCode: z.ZodString;
    rememberDevice: z.ZodOptional<z.ZodBoolean>;
    deviceId: z.ZodOptional<z.ZodString>;
    deviceName: z.ZodOptional<z.ZodString>;
    platform: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    authKey: string;
    twoFactorCode: string;
    deviceId?: string | undefined;
    deviceName?: string | undefined;
    platform?: string | undefined;
    rememberDevice?: boolean | undefined;
}, {
    email: string;
    authKey: string;
    twoFactorCode: string;
    deviceId?: string | undefined;
    deviceName?: string | undefined;
    platform?: string | undefined;
    rememberDevice?: boolean | undefined;
}>;
export declare const refreshSchema: z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId?: string | undefined;
}, {
    sessionId?: string | undefined;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentAuthKey: z.ZodString;
    newAuthKey: z.ZodString;
    newKekSalt: z.ZodString;
    newAuthSalt: z.ZodString;
    newIterations: z.ZodNumber;
    newWrappedDEK: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentAuthKey: string;
    newAuthKey: string;
    newKekSalt: string;
    newAuthSalt: string;
    newIterations: number;
    newWrappedDEK: string;
}, {
    currentAuthKey: string;
    newAuthKey: string;
    newKekSalt: string;
    newAuthSalt: string;
    newIterations: number;
    newWrappedDEK: string;
}>;
export declare const setup2faSchema: z.ZodObject<{
    secret: z.ZodString;
}, "strip", z.ZodTypeAny, {
    secret: string;
}, {
    secret: string;
}>;
export declare const verify2faSetupSchema: z.ZodObject<{
    secret: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    secret: string;
    code: string;
}, {
    secret: string;
    code: string;
}>;
export declare const deleteAccountSchema: z.ZodObject<{
    authKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    authKey: string;
}, {
    authKey: string;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newAuthKey: z.ZodString;
    newKekSalt: z.ZodString;
    newAuthSalt: z.ZodString;
    newIterations: z.ZodNumber;
    newWrappedDEK: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newAuthKey: string;
    newKekSalt: string;
    newAuthSalt: string;
    newIterations: number;
    newWrappedDEK: string;
    token: string;
}, {
    newAuthKey: string;
    newKekSalt: string;
    newAuthSalt: string;
    newIterations: number;
    newWrappedDEK: string;
    token: string;
}>;
export declare const vaultEntrySchema: z.ZodObject<{
    type: z.ZodEnum<["login", "password", "note", "card", "identity", "apiKey", "secret", "journal", "address", "contact"]>;
    encrypted: z.ZodString;
    iv: z.ZodString;
    title: z.ZodString;
    folderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    favorite: z.ZodOptional<z.ZodBoolean>;
    pinned: z.ZodOptional<z.ZodBoolean>;
    archived: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "login" | "password" | "note" | "card" | "identity" | "apiKey" | "secret" | "journal" | "address" | "contact";
    title: string;
    encrypted: string;
    iv: string;
    folderId?: string | null | undefined;
    tags?: string[] | undefined;
    favorite?: boolean | undefined;
    pinned?: boolean | undefined;
    archived?: boolean | undefined;
}, {
    type: "login" | "password" | "note" | "card" | "identity" | "apiKey" | "secret" | "journal" | "address" | "contact";
    title: string;
    encrypted: string;
    iv: string;
    folderId?: string | null | undefined;
    tags?: string[] | undefined;
    favorite?: boolean | undefined;
    pinned?: boolean | undefined;
    archived?: boolean | undefined;
}>;
export declare const folderSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<["login", "password", "note", "card", "identity", "apiKey", "secret", "journal", "address", "contact", "all"]>>;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type?: "login" | "password" | "note" | "card" | "identity" | "apiKey" | "secret" | "journal" | "address" | "contact" | "all" | undefined;
    color?: string | undefined;
}, {
    name: string;
    type?: "login" | "password" | "note" | "card" | "identity" | "apiKey" | "secret" | "journal" | "address" | "contact" | "all" | undefined;
    color?: string | undefined;
}>;
export declare const albumSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const passwordHealthSchema: z.ZodObject<{
    entries: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        password: string;
        title: string;
        id: string;
        username?: string | undefined;
        url?: string | undefined;
    }, {
        password: string;
        title: string;
        id: string;
        username?: string | undefined;
        url?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        password: string;
        title: string;
        id: string;
        username?: string | undefined;
        url?: string | undefined;
    }[];
}, {
    entries: {
        password: string;
        title: string;
        id: string;
        username?: string | undefined;
        url?: string | undefined;
    }[];
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type Verify2faInput = z.infer<typeof verify2faSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type Setup2faInput = z.infer<typeof setup2faSchema>;
export type Verify2faSetupInput = z.infer<typeof verify2faSetupSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VaultEntryInput = z.infer<typeof vaultEntrySchema>;
export type FolderInput = z.infer<typeof folderSchema>;
export type AlbumInput = z.infer<typeof albumSchema>;
export type PasswordHealthInput = z.infer<typeof passwordHealthSchema>;
