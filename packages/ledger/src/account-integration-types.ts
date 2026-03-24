/**
 * Types for local-first account integration and synchronization
 * 
 * This module supports the local-first, privacy-by-design approach where
 * users own their data completely. Primary method is file-based import.
 */

export type ImportSource = 'ofx' | 'qfx' | 'csv' | 'obp_selfhosted' | 'plaid_optional' | 'manual';
export type ImportStatus = 'pending' | 'importing' | 'success' | 'error';
export type PrivacyLevel = 'local' | 'self-hosted' | 'third-party';
export type ImportType = 'full' | 'incremental';

/**
 * CSV template for bank-specific CSV imports
 */
export interface CSVTemplate {
  id: string;
  name: string; // "Chase Checking", "Bank of America"
  bankName: string;
  accountType?: string;
  dateColumn: string | number;
  descriptionColumn: string | number;
  amountColumn: string | number;
  dateFormat: string; // "MM/DD/YYYY", "YYYY-MM-DD"
  amountFormat?: string; // "1,234.56", "1234.56"
  headerRow?: number;
  skipRows?: number;
  encoding?: string; // "utf-8", "latin1"
  delimiter?: string; // ",", ";", "\t"
}

/**
 * Import source configuration for file-based or self-hosted sync
 */
export interface ImportSourceConfig {
  id: string;
  type: ImportSource;
  name: string; // User-friendly name
  enabled: boolean;
  privacyLevel: PrivacyLevel;
  
  // File-based configuration (primary method)
  fileConfig?: {
    watchFolder?: string; // Auto-import from this folder
    autoImport?: boolean;
    archiveAfterImport?: boolean;
    archivePath?: string;
    supportedFormats?: Array<'ofx' | 'qfx' | 'csv'>;
  };
  
  // CSV-specific configuration
  csvTemplate?: CSVTemplate;
  
  // Self-hosted Open Bank Project configuration
  obpConfig?: {
    serverUrl: string; // User's self-hosted OBP server
    apiKey?: string; // Encrypted
    accountId?: string;
  };
  
  // Optional Plaid (user must explicitly opt-in with privacy warning)
  plaidConfig?: {
    accessToken?: string; // Encrypted
    itemId?: string;
    consentGiven?: Date; // When user explicitly consented
    privacyWarningShown?: boolean;
  };
  
  lastImportAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * History of file import operations
 */
export interface ImportHistory {
  id: string;
  sourceConfigId: string;
  type: ImportSource;
  status: ImportStatus;
  
  // File metadata
  fileName?: string;
  filePath?: string;
  fileHash?: string; // SHA-256 to prevent duplicate imports
  fileSize?: number;
  
  // Import results
  importedAt: Date;
  transactionsImported: number;
  transactionsSkipped: number; // Duplicates
  transactionsFailed: number;
  errors: string[];
  
  // Privacy tracking
  privacyLevel: PrivacyLevel;
  dataSharedWith?: string[]; // Empty for local, ['self-hosted OBP'] or ['Plaid'] if applicable
  
  metadata?: Record<string, any>;
}

/**
 * OFX/QFX transaction data
 */
export interface OFXTransaction {
  id: string; // FITID from OFX
  type: 'debit' | 'credit' | 'other';
  date: string; // DTPOSTED
  amount: number;
  name: string; // NAME or MEMO
  memo?: string;
  checkNum?: string;
}

/**
 * Parsed CSV transaction data
 */
export interface ParsedCSVTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  balance?: number;
  metadata?: Record<string, string>;
}

/**
 * Result of a file import operation
 */
export interface ImportResult {
  success: boolean;
  sourceConfigId: string;
  fileName?: string;
  transactionsImported: number;
  transactionsSkipped: number; // Duplicates
  transactionsFailed: number;
  errors: Array<{
    line?: number;
    field?: string;
    message: string;
    transaction?: Partial<ParsedCSVTransaction>;
  }>;
  duration: number; // milliseconds
  timestamp: Date;
  fileHash?: string;
  /** The ImportSession id created for this import (undefined when skipped as duplicate). */
  importSessionId?: string;
  privacyLevel: PrivacyLevel;
}

/**
 * Interface for file importers (OFX, QFX, CSV)
 */
export interface IFileImporter {
  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[];
  
  /**
   * Check if file can be imported
   */
  canImport(filePath: string): Promise<boolean>;
  
  /**
   * Import transactions from file
   */
  import(filePath: string, options?: {
    accountId?: string;
    csvTemplate?: CSVTemplate;
  }): Promise<ImportResult>;
  
  /**
   * Validate file format
   */
  validate(filePath: string): Promise<{
    valid: boolean;
    errors: string[];
  }>;
}

/**
 * Local-first account integration error
 */
export enum AccountIntegrationErrorCode {
  // File errors
  FILE_NOT_FOUND = 'file_not_found',
  FILE_INVALID_FORMAT = 'file_invalid_format',
  FILE_CORRUPTED = 'file_corrupted',
  FILE_TOO_LARGE = 'file_too_large',
  FILE_ALREADY_IMPORTED = 'file_already_imported',
  
  // CSV template errors
  TEMPLATE_NOT_FOUND = 'template_not_found',
  TEMPLATE_INVALID = 'template_invalid',
  COLUMN_NOT_FOUND = 'column_not_found',
  
  // Import errors
  IMPORT_FAILED = 'import_failed',
  PARSE_ERROR = 'parse_error',
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  INVALID_DATA = 'invalid_data',
  
  // Privacy errors
  PRIVACY_WARNING_NOT_ACKNOWLEDGED = 'privacy_warning_not_acknowledged',
  THIRD_PARTY_NOT_CONSENTED = 'third_party_not_consented',
  
  // System errors
  STORAGE_ERROR = 'storage_error',
  INTERNAL_ERROR = 'internal_error',
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
      case AccountIntegrationErrorCode.FILE_NOT_FOUND:
        return 'File not found. Please check the file path.';
      case AccountIntegrationErrorCode.FILE_INVALID_FORMAT:
        return 'File format not recognized. Please use OFX, QFX, or CSV files.';
      case AccountIntegrationErrorCode.FILE_CORRUPTED:
        return 'File appears to be corrupted. Please download it again from your bank.';
      case AccountIntegrationErrorCode.FILE_TOO_LARGE:
        return 'File is too large to import. Please split it into smaller files.';
      case AccountIntegrationErrorCode.FILE_ALREADY_IMPORTED:
        return 'This file has already been imported.';
      case AccountIntegrationErrorCode.TEMPLATE_NOT_FOUND:
        return 'No template found for this bank. Please create or select a CSV template.';
      case AccountIntegrationErrorCode.TEMPLATE_INVALID:
        return 'CSV template is invalid. Please check column mappings.';
      case AccountIntegrationErrorCode.COLUMN_NOT_FOUND:
        return 'Required column not found in CSV file. Check your template configuration.';
      case AccountIntegrationErrorCode.IMPORT_FAILED:
        return 'Import failed. Please check the file format and try again.';
      case AccountIntegrationErrorCode.PARSE_ERROR:
        return 'Error parsing file. The file may be malformed.';
      case AccountIntegrationErrorCode.DUPLICATE_TRANSACTION:
        return 'Transaction already exists in the database.';
      case AccountIntegrationErrorCode.INVALID_DATA:
        return 'Invalid transaction data found. Please check the file.';
      case AccountIntegrationErrorCode.PRIVACY_WARNING_NOT_ACKNOWLEDGED:
        return 'You must acknowledge the privacy implications before proceeding.';
      case AccountIntegrationErrorCode.THIRD_PARTY_NOT_CONSENTED:
        return 'Third-party data sharing requires explicit consent.';
      default:
        return 'An unexpected error occurred during import.';
    }
  }

  /**
   * Check if error is recoverable by user action
   */
  isRecoverable(): boolean {
    const recoverableCodes = [
      AccountIntegrationErrorCode.FILE_NOT_FOUND,
      AccountIntegrationErrorCode.FILE_INVALID_FORMAT,
      AccountIntegrationErrorCode.FILE_CORRUPTED,
      AccountIntegrationErrorCode.TEMPLATE_NOT_FOUND,
      AccountIntegrationErrorCode.TEMPLATE_INVALID,
      AccountIntegrationErrorCode.COLUMN_NOT_FOUND,
      AccountIntegrationErrorCode.PRIVACY_WARNING_NOT_ACKNOWLEDGED,
    ];
    return recoverableCodes.includes(this.code);
  }
}
