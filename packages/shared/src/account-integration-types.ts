/**
 * Types for account integration and synchronization
 */

export type AccountProvider = 'plaid' | 'obp' | 'manual';
export type SyncStatus = 'active' | 'error' | 'disconnected' | 'pending';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
export type SyncType = 'full' | 'incremental';
export type ConnectionStatus = 'success' | 'partial' | 'failed';

/**
 * Represents a connection to an external financial institution
 */
export interface AccountConnection {
  id: string;
  accountId: string; // Reference to Account in main DB
  provider: AccountProvider;
  providerAccountId: string; // External account ID from provider
  institutionId: string;
  institutionName: string;
  accessToken: string; // Encrypted
  itemId?: string; // Provider-specific identifier (e.g., Plaid item_id)
  lastSyncAt: Date;
  syncStatus: SyncStatus;
  syncError?: string;
  autoSync: boolean;
  syncFrequency: SyncFrequency;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * History of synchronization attempts
 */
export interface SyncHistory {
  id: string;
  connectionId: string;
  syncType: SyncType;
  startedAt: Date;
  completedAt?: Date;
  status: ConnectionStatus;
  transactionsImported: number;
  balanceUpdated: boolean;
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * External account representation from provider
 */
export interface ExternalAccount {
  id: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask?: string; // Last 4 digits
  balance: {
    current: number;
    available?: number;
    limit?: number;
    currency: string;
  };
}

/**
 * External transaction representation from provider
 */
export interface ExternalTransaction {
  id: string;
  accountId: string;
  amount: number;
  date: string; // ISO date string
  name: string;
  merchantName?: string;
  category?: string[];
  pending: boolean;
  transactionType?: string;
  paymentChannel?: string;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Account balance information
 */
export interface AccountBalance {
  accountId: string;
  current: number;
  available?: number;
  limit?: number;
  currency: string;
  asOf: Date;
}

/**
 * Configuration for account synchronization
 */
export interface SyncConfiguration {
  enabled: boolean;
  frequency: SyncFrequency;
  autoImportTransactions: boolean;
  autoUpdateBalances: boolean;
  notifyOnSync: boolean;
  notifyOnError: boolean;
  deduplicationEnabled: boolean;
  conflictResolution: 'prefer-external' | 'prefer-local' | 'ask';
  maxTransactionAge?: number; // Days to look back
  batchSize?: number; // Transactions per sync batch
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  connectionId: string;
  accountsUpdated: number;
  transactionsImported: number;
  transactionsSkipped: number;
  balancesUpdated: number;
  errors: Array<{
    code: string;
    message: string;
    accountId?: string;
  }>;
  duration: number; // milliseconds
  timestamp: Date;
}

/**
 * Provider-agnostic interface for account integration services
 */
export interface IAccountProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Initialize link/auth flow
   * Returns URL or token to start connection process
   */
  createLinkToken(userId: string, options?: {
    redirectUri?: string;
    webhook?: string;
    countryCodes?: string[];
    language?: string;
  }): Promise<string>;

  /**
   * Exchange public token for access token
   */
  exchangeToken(publicToken: string): Promise<{
    accessToken: string;
    itemId?: string;
  }>;

  /**
   * Get accounts for a connection
   */
  getAccounts(accessToken: string): Promise<ExternalAccount[]>;

  /**
   * Get transactions for an account
   */
  getTransactions(
    accessToken: string,
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExternalTransaction[]>;

  /**
   * Get current balances
   */
  getBalances(
    accessToken: string,
    accountId: string
  ): Promise<AccountBalance>;

  /**
   * Remove/disconnect connection
   */
  removeConnection(accessToken: string): Promise<void>;

  /**
   * Refresh connection if needed
   */
  refreshConnection?(accessToken: string): Promise<{
    accessToken: string;
    expiresAt?: Date;
  }>;

  /**
   * Get institution information
   */
  getInstitution?(institutionId: string): Promise<{
    id: string;
    name: string;
    url?: string;
    logo?: string;
    primaryColor?: string;
  }>;
}

/**
 * Error types for account integration
 */
export enum AccountIntegrationErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'invalid_credentials',
  TOKEN_EXPIRED = 'token_expired',
  ITEM_LOGIN_REQUIRED = 'item_login_required',
  MFA_REQUIRED = 'mfa_required',

  // Connection errors
  INSTITUTION_DOWN = 'institution_down',
  INSTITUTION_NOT_RESPONDING = 'institution_not_responding',
  NETWORK_ERROR = 'network_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // Account errors
  ACCOUNT_NOT_FOUND = 'account_not_found',
  ACCOUNT_LOCKED = 'account_locked',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',

  // Data errors
  INVALID_DATA = 'invalid_data',
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  DATA_CONFLICT = 'data_conflict',

  // System errors
  PROVIDER_ERROR = 'provider_error',
  INTERNAL_ERROR = 'internal_error',
  CONFIGURATION_ERROR = 'configuration_error',
}

/**
 * Custom error class for account integration
 */
export class AccountIntegrationError extends Error {
  constructor(
    public code: AccountIntegrationErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AccountIntegrationError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case AccountIntegrationErrorCode.INVALID_CREDENTIALS:
        return 'The credentials you provided are incorrect. Please try again.';
      case AccountIntegrationErrorCode.TOKEN_EXPIRED:
      case AccountIntegrationErrorCode.ITEM_LOGIN_REQUIRED:
        return 'Your bank connection expired. Please reconnect your account.';
      case AccountIntegrationErrorCode.MFA_REQUIRED:
        return 'Your bank requires additional authentication. Please complete the verification.';
      case AccountIntegrationErrorCode.INSTITUTION_DOWN:
      case AccountIntegrationErrorCode.INSTITUTION_NOT_RESPONDING:
        return 'Your bank is currently unavailable. Please try again later.';
      case AccountIntegrationErrorCode.NETWORK_ERROR:
        return 'Unable to connect to your bank. Please check your internet connection.';
      case AccountIntegrationErrorCode.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please wait a moment and try again.';
      case AccountIntegrationErrorCode.ACCOUNT_NOT_FOUND:
        return 'Account not found. It may have been closed or removed.';
      case AccountIntegrationErrorCode.ACCOUNT_LOCKED:
        return 'Your account is locked. Please contact your bank.';
      case AccountIntegrationErrorCode.INSUFFICIENT_PERMISSIONS:
        return 'Additional permissions are needed to access this account. Please reconnect.';
      case AccountIntegrationErrorCode.DUPLICATE_TRANSACTION:
        return 'This transaction was already imported.';
      case AccountIntegrationErrorCode.DATA_CONFLICT:
        return 'There is a conflict with existing data. Please review manually.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  /**
   * Check if error is recoverable by user action
   */
  isRecoverable(): boolean {
    const recoverableCodes = [
      AccountIntegrationErrorCode.INVALID_CREDENTIALS,
      AccountIntegrationErrorCode.TOKEN_EXPIRED,
      AccountIntegrationErrorCode.ITEM_LOGIN_REQUIRED,
      AccountIntegrationErrorCode.MFA_REQUIRED,
      AccountIntegrationErrorCode.NETWORK_ERROR,
    ];
    return recoverableCodes.includes(this.code);
  }

  /**
   * Check if error should trigger a retry
   */
  shouldRetry(): boolean {
    const retryableCodes = [
      AccountIntegrationErrorCode.NETWORK_ERROR,
      AccountIntegrationErrorCode.INSTITUTION_NOT_RESPONDING,
      AccountIntegrationErrorCode.RATE_LIMIT_EXCEEDED,
    ];
    return retryableCodes.includes(this.code);
  }
}
