export * from './csv-importer.js';
export * from './ofx-importer.js';

import { AccountIntegrationService } from '@financialadvisor/ledger';
import { CSVImporter, createCommonBankTemplates } from './csv-importer.js';
import { OFXImporter } from './ofx-importer.js';

/**
 * Create and configure account integration service with default importers.
 * 
 * @returns Configured service instance
 */
export function createAccountIntegrationService(): AccountIntegrationService {
  const service = new AccountIntegrationService();

  const csvImporter = new CSVImporter();
  const ofxImporter = new OFXImporter();

  service.registerImporter(['csv', 'txt'], csvImporter);
  service.registerImporter(['ofx', 'qfx'], ofxImporter);

  const commonTemplates = createCommonBankTemplates();
  for (const template of commonTemplates) {
    service.registerCSVTemplate(template);
  }

  return service;
}
