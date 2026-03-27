/** Re-exports the CSV transaction importer and bank template helpers. */
export * from './csv-importer.js';
/** Re-exports the OFX/QFX transaction importer. */
export * from './ofx-importer.js';
/** Re-exports the import-session store for tracking import history. */
export * from './import-session-store.js';
/** Re-exports the raw-transaction model and store. */
export * from './raw-transaction.js';
/** Re-exports the transaction-level deduplication helpers. */
export * from './dedup.js';

import { AccountIntegrationService } from '@financialadvisor/ledger';
import { TransactionHashStore } from '@financialadvisor/storage';
import { CSVImporter, createCommonBankTemplates } from './csv-importer.js';
import { OFXImporter } from './ofx-importer.js';
import { ImportSessionStore } from './import-session-store.js';
import { RawTransactionStore } from './raw-transaction.js';

/**
 * Create and configure an AccountIntegrationService with shared stores and
 * default importers.
 *
 * Both the CSV and OFX importers share the same ImportSessionStore,
 * RawTransactionStore, and TransactionHashStore so that transaction-level
 * deduplication works correctly across file types and across re-imports.
 *
 * @returns Configured service instance
 */
export function createAccountIntegrationService(): AccountIntegrationService {
  const sessionStore = new ImportSessionStore();
  const txStore = new RawTransactionStore();
  const hashStore = new TransactionHashStore();

  const csvImporter = new CSVImporter(sessionStore, txStore, hashStore);
  const ofxImporter = new OFXImporter(sessionStore, txStore, hashStore);

  const service = new AccountIntegrationService();
  service.registerImporter(['csv', 'txt'], csvImporter);
  service.registerImporter(['ofx', 'qfx'], ofxImporter);

  const commonTemplates = createCommonBankTemplates();
  for (const template of commonTemplates) {
    service.registerCSVTemplate(template);
  }

  return service;
}
