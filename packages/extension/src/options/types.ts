export type Plan = 'free' | 'pro';

export type Tab = 'oauth' | 'manual';

export interface SyncStatus {
  isConnected: boolean;
  lastSync?: string;
  error?: string;
  isLoading?: boolean;
}
