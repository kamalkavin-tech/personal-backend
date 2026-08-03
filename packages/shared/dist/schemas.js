"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordHealthSchema = exports.albumSchema = exports.folderSchema = exports.vaultEntrySchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.deleteAccountSchema = exports.verify2faSetupSchema = exports.setup2faSchema = exports.changePasswordSchema = exports.refreshSchema = exports.verify2faSchema = exports.loginSchema = exports.prepareLoginSchema = exports.registerSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.emailSchema = zod_1.z.string().email().max(254);
exports.registerSchema = zod_1.z.object({
    email: exports.emailSchema,
    name: zod_1.z.string().trim().min(1).max(80).optional(),
    masterPassword: zod_1.z.string().min(8).max(256).optional(),
    kekSalt: zod_1.z.string().min(16),
    authSalt: zod_1.z.string().min(16),
    iterations: zod_1.z.number().int().min(10000).max(10000000),
    wrappedDEK: zod_1.z.string().min(8),
    authKey: zod_1.z.string().min(16),
    deviceId: zod_1.z.string().min(8).optional(),
    deviceName: zod_1.z.string().optional(),
    platform: zod_1.z.string().optional(),
});
exports.prepareLoginSchema = zod_1.z.object({
    email: exports.emailSchema,
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    authKey: zod_1.z.string().min(16),
    twoFactorCode: zod_1.z.string().optional(),
    rememberDevice: zod_1.z.boolean().optional(),
    deviceId: zod_1.z.string().min(8).optional(),
    deviceName: zod_1.z.string().optional(),
    platform: zod_1.z.string().optional(),
});
exports.verify2faSchema = zod_1.z.object({
    email: exports.emailSchema,
    authKey: zod_1.z.string().min(16),
    twoFactorCode: zod_1.z.string().regex(/^\d{6}$/),
    rememberDevice: zod_1.z.boolean().optional(),
    deviceId: zod_1.z.string().min(8).optional(),
    deviceName: zod_1.z.string().optional(),
    platform: zod_1.z.string().optional(),
});
exports.refreshSchema = zod_1.z.object({
    sessionId: zod_1.z.string().optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    currentAuthKey: zod_1.z.string().min(16),
    newAuthKey: zod_1.z.string().min(16),
    newKekSalt: zod_1.z.string().min(16),
    newAuthSalt: zod_1.z.string().min(16),
    newIterations: zod_1.z.number().int().min(10000).max(10000000),
    newWrappedDEK: zod_1.z.string().min(8),
});
exports.setup2faSchema = zod_1.z.object({
    secret: zod_1.z.string().min(16),
});
exports.verify2faSetupSchema = zod_1.z.object({
    secret: zod_1.z.string().min(16),
    code: zod_1.z.string().regex(/^\d{6}$/),
});
exports.deleteAccountSchema = zod_1.z.object({
    authKey: zod_1.z.string().min(16),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: exports.emailSchema,
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(8),
    newAuthKey: zod_1.z.string().min(16),
    newKekSalt: zod_1.z.string().min(16),
    newAuthSalt: zod_1.z.string().min(16),
    newIterations: zod_1.z.number().int().min(10000).max(10000000),
    newWrappedDEK: zod_1.z.string().min(8),
});
exports.vaultEntrySchema = zod_1.z.object({
    type: zod_1.z.enum(types_1.VAULT_TYPES),
    encrypted: zod_1.z.string().min(1),
    iv: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1).max(200),
    folderId: zod_1.z.string().nullable().optional(),
    tags: zod_1.z.array(zod_1.z.string().max(60)).max(20).optional(),
    favorite: zod_1.z.boolean().optional(),
    pinned: zod_1.z.boolean().optional(),
    archived: zod_1.z.boolean().optional(),
});
exports.folderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80),
    type: zod_1.z.enum([...types_1.VAULT_TYPES, 'all']).optional(),
    color: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
exports.albumSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80),
});
exports.passwordHealthSchema = zod_1.z.object({
    entries: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        username: zod_1.z.string().optional(),
        password: zod_1.z.string(),
        url: zod_1.z.string().optional(),
    })),
});
