/**
 * Local-First Account Integration Service
 *
 * This service manages file-based account imports and synchronization
 * following the local-first, privacy-by-design principles.
 */

import type {
  IFileImporter,
  ImportSourceConfig,
  ImportResult,
  ImportHistory,
  CSVTemplate,
  PrivacyLevel,
} from './account-integration-types.js';

/**
 * Account integration service for local-first file imports
 *
 * Primary method: File-based import (OFX/QFX/CSV)
 * Secondary: Self-hosted Open Bank Project
 * Optional: Plaid (with explicit user consent and privacy warnings)
 */
export class AccountIntegrationService {
  private importers: Map<string, IFileImporter>;
  private csvTemplates: Map<string, CSVTemplate>;

  constructor() {
    this.importers = new Map();
    this.csvTemplates = new Map();
  }

  /**
   * Register a file importer (OFX, QFX, CSV)
   *
   * @param extensions - File extensions this importer handles
   * @param importer - Importer implementation
   */
  registerImporter(extensions: string[], importer: IFileImporter): void {
    for (const ext of extensions) {
      this.importers.set(ext.toLowerCase(), importer);
    }
  }

  /**
   * Register a CSV template for a specific bank
   *
   * @param template - CSV template configuration
   */
  registerCSVTemplate(template: CSVTemplate): void {
    this.csvTemplates.set(template.id, template);
  }

  /**
   * Get CSV template by ID
   *
   * @param templateId - Template ID
   * @returns CSV template or undefined
   */
  getCSVTemplate(templateId: string): CSVTemplate | undefined {
    return this.csvTemplates.get(templateId);
  }

  /**
   * List all registered CSV templates
   *
   * @returns Array of CSV templates
   */
  listCSVTemplates(): CSVTemplate[] {
    return Array.from(this.csvTemplates.values());
  }

  /**
   * Import transactions from a file
   *
   * @param filePath - Path to file to import
   * @param options - Import options
   * @returns Import result
   *
   * @example
   * ```typescript
   * const result = await service.importFile('/path/to/transactions.ofx', {
   *   accountId: 'account-123',
   * });
   * console.log(`Imported ${result.transactionsImported} transactions`);
   * ```
   */
  /**
   * Import transactions from a file
   *
   * @param filePath - Path to file to import
   * @param options - Import options
   * @returns Import result
   *
   * @example
   * ```typescript
   * const result = await service.importFile('/path/to/transactions.ofx', {
   *   accountId: 'account-123',
   * });
   * console.log(`Imported ${result.transactionsImported} transactions`);
   * ```
   */
  async importFile(
    filePath: string,
    options?: {
      accountId?: string;
      csvTemplateId?: string;
      sourceConfigId?: string;
    }
  ): Promise<ImportResult> {
    // 1. Detect file type from extension
    const extension = filePath.toLowerCase().split('.').pop() || '';

    // 2. Find appropriate importer
    const importer = this.importers.get(extension);
    if (!importer) {
      throw new Error(`No importer found for file type: ${extension}`);
    }

    // 3. For CSV, load template if provided
    let csvTemplate: CSVTemplate | undefined;
    if (extension === 'csv' && options?.csvTemplateId) {
      csvTemplate = this.csvTemplates.get(options.csvTemplateId);
      if (!csvTemplate) {
        throw new Error(`CSV template not found: ${options.csvTemplateId}`);
      }
    }

    // 4. Call importer.import()
    const result = await importer.import(filePath, {
      accountId: options?.accountId,
      csvTemplate,
    });

    // 5. Save import history
    // TODO: Implement import history storage
    // Priority: High - Required for duplicate detection
    // Implementation: packages/shared/src/database/import-history-repository.ts
    // Will track: fileHash, timestamp, transaction count, errors

    // 6. Return result
    return result;
  }

  /**
   * Watch a directory for new files to auto-import
   *
   * @param directory - Directory to watch
   * @param options - Watch options
   *
   * @example
   * ```typescript
   * await service.watchDirectory('~/Downloads/BankStatements', {
   *   autoImport: true,
   *   archiveAfterImport: true,
   * });
   * ```
   */
  async watchDirectory(
    directory: string,
    options?: {
      autoImport?: boolean;
      archiveAfterImport?: boolean;
      accountId?: string;
      csvTemplateId?: string;
    }
  ): Promise<void> {
    // TODO: Implement directory watcher
    // Priority: High - Phase 5 objective
    // Suggested library: chokidar for cross-platform file watching
    //
    // Implementation plan:
    // 1. Use chokidar to watch directory
    // 2. On file add event, check if it's a financial file (OFX/QFX/CSV)
    // 3. If auto-import enabled, call importFile()
    // 4. If archive enabled, move file to archive folder
    // 5. Track watched directories in memory or database
    //
    // Example:
    // const watcher = chokidar.watch(directory, {
    //   ignored: /(^|[\/\\])\../,
    //   persistent: true
    // });
    // watcher.on('add', async (path) => {
    //   if (this.isSupportedFile(path)) {
    //     await this.importFile(path, options);
    //     if (options?.archiveAfterImport) {
    //       await this.archiveFile(path);
    //     }
    //   }
    // });

    throw new Error('AccountIntegrationService.watchDirectory not implemented');
  }

  /**
   * Stop watching a directory
   *
   * @param directory - Directory to stop watching
   */
  async unwatchDirectory(directory: string): Promise<void> {
    // TODO: Implement unwatching
    throw new Error('AccountIntegrationService.unwatchDirectory not implemented');
  }

  /**
   * Get import history for a source
   *
   * @param sourceConfigId - Source configuration ID
   * @param options - Query options
   * @returns Array of import history records
   */
  async getImportHistory(
    sourceConfigId?: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ImportHistory[]> {
    // TODO: Implement history retrieval
    throw new Error('AccountIntegrationService.getImportHistory not implemented');
  }

  /**
   * Check if user has consented to third-party data sharing (for Plaid)
   *
   * @param sourceConfigId - Source configuration ID
   * @returns Whether consent was given
   */
  async checkPrivacyConsent(sourceConfigId: string): Promise<boolean> {
    // TODO: Implement consent checking
    // 1. Load source configuration
    // 2. Check if it's a third-party source (Plaid)
    // 3. Verify consent was given
    // 4. Return result

    throw new Error('AccountIntegrationService.checkPrivacyConsent not implemented');
  }

  /**
   * Request user consent for third-party data sharing
   *
   * @param sourceConfigId - Source configuration ID
   * @param privacyLevel - Privacy level of the source
   * @returns Whether user consented
   *
   * @example
   * ```typescript
   * const consented = await service.requestPrivacyConsent('plaid-config-1', 'third-party');
   * if (!consented) {
   *   console.log('User declined third-party data sharing');
   *   return;
   * }
   * ```
   */
  async requestPrivacyConsent(
    sourceConfigId: string,
    privacyLevel: PrivacyLevel
  ): Promise<boolean> {
    // TODO: Implement consent request
    // 1. Show privacy warning dialog
    // 2. Explain what data will be shared
    // 3. Record user's decision
    // 4. Return consent status

    throw new Error('AccountIntegrationService.requestPrivacyConsent not implemented');
  }
}

import { CSVImporter, createCommonBankTemplates } from './csv-importer.js';
import { OFXImporter } from './ofx-importer.js';

/**
 * Create and configure account integration service
 *
 * @returns Configured service instance
 */
export function createAccountIntegrationService(): AccountIntegrationService {
  const service = new AccountIntegrationService();

  // Register default importers
  const csvImporter = new CSVImporter();
  const ofxImporter = new OFXImporter();

  // Register CSV importer for .csv and .txt files
  service.registerImporter(['csv', 'txt'], csvImporter);

  // Register OFX importer for .ofx and .qfx files
  service.registerImporter(['ofx', 'qfx'], ofxImporter);

  // Load pre-configured CSV templates for common banks
  const commonTemplates = createCommonBankTemplates();
  for (const template of commonTemplates) {
    service.registerCSVTemplate(template);
  }

  return service;
}

/**
 * Implementation notes:
 *
 * To fully implement this service:
 *
 * 1. Add file importers:
 *    - OFXImporter (use ofx-parser library or build our own)
 *    - QFXImporter (compatible with OFX)
 *    - CSVImporter (flexible CSV parsing)
 *
 * 2. Implement directory watcher:
 *    - Use chokidar for file watching
 *    - Support auto-import on file add
 *    - Handle file archival
 *
 * 3. Add CSV templates:
 *    - Pre-configure for top 50 US banks
 *    - Allow user to create custom templates
 *    - Community template sharing
 *
 * 4. Implement privacy consent:
 *    - Clear warning dialogs
 *    - Record consent decisions
 *    - Easy opt-out
 *
 * 5. Add transaction deduplication:
 *    - Match by transaction ID if available
 *    - Match by date + amount + description
 *    - Handle pending vs. posted
 *
 * 6. Integrate with PluresDB:
 *    - Encrypted transaction storage
 *    - Import history tracking
 *    - Vector embeddings for AI
 *
 * See docs/LOCAL_FIRST_INTEGRATION_PLAN.md for complete implementation guide.
 */
