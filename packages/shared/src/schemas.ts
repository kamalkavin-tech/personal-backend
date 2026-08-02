import { z } from 'zod';
import { VAULT_TYPES } from './types';

export const emailSchema = z.string().email().max(254);

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(80).optional(),
  masterPassword: z.string().min(8).max(256).optional(),
  kekSalt: z.string().min(16),
  authSalt: z.string().min(16),
  iterations: z.number().int().min(10000).max(10000000),
  wrappedDEK: z.string().min(8),
  authKey: z.string().min(16),
  deviceId: z.string().min(8).optional(),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
});

export const prepareLoginSchema = z.object({
  email: emailSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  authKey: z.string().min(16),
  twoFactorCode: z.string().optional(),
  rememberDevice: z.boolean().optional(),
  deviceId: z.string().min(8).optional(),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
});

export const verify2faSchema = z.object({
  email: emailSchema,
  authKey: z.string().min(16),
  twoFactorCode: z.string().regex(/^\d{6}$/),
  rememberDevice: z.boolean().optional(),
  deviceId: z.string().min(8).optional(),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
});

export const refreshSchema = z.object({
  sessionId: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentAuthKey: z.string().min(16),
  newAuthKey: z.string().min(16),
  newKekSalt: z.string().min(16),
  newAuthSalt: z.string().min(16),
  newIterations: z.number().int().min(10000).max(10000000),
  newWrappedDEK: z.string().min(8),
});

export const setup2faSchema = z.object({
  secret: z.string().min(16),
});

export const verify2faSetupSchema = z.object({
  secret: z.string().min(16),
  code: z.string().regex(/^\d{6}$/),
});

export const deleteAccountSchema = z.object({
  authKey: z.string().min(16),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(8),
  newAuthKey: z.string().min(16),
  newKekSalt: z.string().min(16),
  newAuthSalt: z.string().min(16),
  newIterations: z.number().int().min(10000).max(10000000),
  newWrappedDEK: z.string().min(8),
});

export const vaultEntrySchema = z.object({
  type: z.enum(VAULT_TYPES),
  encrypted: z.string().min(1),
  iv: z.string().min(1),
  title: z.string().min(1).max(200),
  folderId: z.string().nullable().optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  favorite: z.boolean().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const folderSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum([...VAULT_TYPES, 'all'] as const).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const albumSchema = z.object({
  name: z.string().min(1).max(80),
});

export const passwordHealthSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      username: z.string().optional(),
      password: z.string(),
      url: z.string().optional(),
    }),
  ),
});

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
