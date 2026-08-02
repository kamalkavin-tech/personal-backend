import { VaultType } from './types';

export const VAULT_TYPE_META: Record<VaultType, { label: string; icon: string; singular: string }> = {
  login: { label: 'Logins', icon: 'login', singular: 'Login' },
  password: { label: 'Passwords', icon: 'password', singular: 'Password' },
  note: { label: 'Notes', icon: 'note', singular: 'Note' },
  card: { label: 'Cards', icon: 'card', singular: 'Card' },
  identity: { label: 'Identities', icon: 'identity', singular: 'Identity' },
  apiKey: { label: 'API Keys', icon: 'apiKey', singular: 'API Key' },
  secret: { label: 'Secrets', icon: 'secret', singular: 'Secret' },
  journal: { label: 'Journal', icon: 'journal', singular: 'Journal entry' },
  address: { label: 'Addresses', icon: 'address', singular: 'Address' },
  contact: { label: 'Contacts', icon: 'contact', singular: 'Contact' },
};

export const DEFAULT_ITERATIONS = 600_000;

export const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export const FOLDER_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];
