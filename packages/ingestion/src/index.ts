export * from './csv-importer.js';
export * from './ofx-importer.js';
export * from './import-session-store.js';
export * from './raw-transaction.js';

import { AccountIntegrationService } from '@financialadvisor/ledger';
import { CSVImporter, createCommonBankTemplates } from './csv-importer.js';
import { OFXImporter } from './ofx-importer.js';
import { ImportSessionStore } from './import-session-store.js';
import { RawTransactionStore } from './raw-transaction.js';

/**
 * Create and configure an AccountIntegrationService with shared stores and
 * default importers.
 *
 * Both the CSV and OFX importers share the same ImportSessionStore and
 * RawTransactionStore so that hash-based deduplication works correctly across
 * file types.
 *
 * @returns Configured service instance
 */
export function createAccountIntegrationService(): AccountIntegrationService {
  const sessionStore = new ImportSessionStore();
  const txStore = new RawTransactionStore();

  const csvImporter = new CSVImporter(sessionStore, txStore);
  const ofxImporter = new OFXImporter(sessionStore, txStore);

  const service = new AccountIntegrationService();
  service.registerImporter(['csv', 'txt'], csvImporter);
  service.registerImporter(['ofx', 'qfx'], ofxImporter);

  const commonTemplates = createCommonBankTemplates();
  for (const template of commonTemplates) {
    service.registerCSVTemplate(template);
  }

  return service;
}
