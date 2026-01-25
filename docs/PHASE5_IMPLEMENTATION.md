# Phase 5 Implementation Guide

## Overview

Phase 5 focuses on implementing local-first bank account integration with file-based imports. This phase emphasizes user data ownership, privacy by design, and zero dependency on third-party aggregators.

**Status**: 🚧 **IN PROGRESS**  
**Start Date**: January 25, 2026  
**Target Version**: 0.5.0

## Philosophy

### Local-First Principles

1. **User Data Ownership** - Users own 100% of their financial data
2. **No Middlemen** - No third parties between users and their data
3. **Privacy by Design** - Privacy is foundational, not optional
4. **Offline-First** - Full functionality without internet connection
5. **Open Source** - Free and transparent alternatives

## Objectives

### 1. File-Based Import ✅ COMPLETE (Foundation)

Implement flexible file import supporting industry-standard formats.

**Features Implemented:**

#### CSV Importer
- Template-based column mapping
- Flexible field detection (name or index)
- Multiple date format support
- Amount parsing with currency symbol handling
- Delimiter auto-detection (comma, semicolon, tab)
- Pre-configured templates for common banks

```typescript
import { CSVImporter, createCommonBankTemplates } from '@financialadvisor/shared';

const importer = new CSVImporter();
const result = await importer.import('/path/to/transactions.csv', {
  accountId: 'account-123',
  csvTemplate: templates.find(t => t.id === 'chase-checking')
});

console.log(`Imported ${result.transactionsImported} transactions`);
```

#### OFX/QFX Importer
- SGML format support (OFX 1.x)
- XML format support (OFX 2.x)
- QFX compatibility (Quicken format)
- Transaction ID (FITID) extraction
- Date, amount, description parsing
- Check number and memo support

```typescript
import { OFXImporter } from '@financialadvisor/shared';

const importer = new OFXImporter();
const result = await importer.import('/path/to/statement.ofx', {
  accountId: 'account-123'
});

console.log(`Imported ${result.transactionsImported} transactions`);
```

#### Common Bank Templates

Pre-configured templates for popular banks:
- Chase Bank (Checking, Savings, Credit Card)
- Bank of America
- Wells Fargo
- Generic CSV (date, description, amount)

### 2. Directory Watcher ⏳ IN PROGRESS

Automatic import from designated folders with file monitoring.

**Planned Features:**

- Watch folder for new OFX/QFX/CSV files
- Auto-import on file detection
- Archive imported files
- Error handling and retry
- Import status notifications
- Configurable file patterns

**Implementation Plan:**

```typescript
import { AccountIntegrationService } from '@financialadvisor/shared';

const service = createAccountIntegrationService();

// Watch directory for auto-import
await service.watchDirectory('~/Downloads/BankStatements', {
  autoImport: true,
  archiveAfterImport: true,
  archivePath: '~/Documents/ImportedStatements',
  accountId: 'account-123'
});
```

### 3. Transaction Deduplication ⏳ PENDING

Intelligent duplicate detection across multiple imports.

**Planned Features:**

- FITID-based deduplication (OFX)
- Hash-based deduplication (CSV)
- Fuzzy matching by date + amount + description
- Pending vs. posted transaction handling
- Manual merge/split tools

**Algorithm:**

1. **Exact Match** - Same FITID or transaction hash
2. **High Confidence** - Same date, amount, and description
3. **Medium Confidence** - Same date and amount, similar description
4. **Low Confidence** - Similar date (±2 days), same amount

### 4. Enhanced CSV Support ⏳ PENDING

Comprehensive CSV template system with community contributions.

**Planned Features:**

- Template builder UI
- Template validation
- Community template repository
- Template import/export
- Support for 50+ bank formats
- Column preview and mapping

**Template Structure:**

```typescript
interface CSVTemplate {
  id: string;
  name: string;
  bankName: string;
  accountType?: string;
  dateColumn: string | number;
  descriptionColumn: string | number;
  amountColumn: string | number;
  dateFormat: string;
  delimiter?: string;
  headerRow?: number;
  skipRows?: number;
  encoding?: string;
}
```

### 5. Open Bank Project Integration ⏳ PENDING

Self-hosted Open Bank Project server support for direct bank connections.

**Planned Features:**

- Self-hosted OBP server configuration
- Bank connector setup
- Direct bank API access (no Plaid)
- OAuth 2.0 authentication
- Real-time balance sync
- Transaction push notifications

## Implementation Progress

### Completed (January 25, 2026)

1. ✅ **File Import Framework**
   - Location: `packages/shared/src/`
   - Files:
     - `csv-importer.ts` (388 lines)
     - `ofx-importer.ts` (347 lines)
     - `account-integration-service.ts` (updated)
   - Test Coverage: Not yet implemented

2. ✅ **CSV Template System**
   - Pre-configured templates for 4 major banks
   - Template validation
   - Column mapping (name and index)
   - Delimiter auto-detection

3. ✅ **Privacy-First Architecture**
   - All processing happens locally
   - Privacy level tracking
   - No external API calls by default
   - Consent management framework

### In Progress

4. **Directory Watcher**
   - Planned implementation: chokidar or fs.watch
   - Auto-import workflow
   - File archival
   - Status: Not started

### Pending

5. **Transaction Deduplication**
6. **Enhanced CSV Support**
7. **Open Bank Project Integration**
8. **Import Management UI**

## Usage Examples

### Basic CSV Import

```typescript
import { createAccountIntegrationService } from '@financialadvisor/shared';

const service = createAccountIntegrationService();

// Import CSV file with template
const result = await service.importFile(
  '/path/to/transactions.csv',
  {
    accountId: 'checking-account-1',
    csvTemplateId: 'chase-checking'
  }
);

if (result.success) {
  console.log(`✅ Imported ${result.transactionsImported} transactions`);
} else {
  console.log(`❌ Import failed with ${result.errors.length} errors`);
  result.errors.forEach(err => console.log(`  - ${err.message}`));
}
```

### OFX Import

```typescript
// Import OFX file
const result = await service.importFile(
  '/path/to/statement.ofx',
  { accountId: 'checking-account-1' }
);

console.log(`File hash: ${result.fileHash}`);
console.log(`Imported: ${result.transactionsImported}`);
console.log(`Skipped (duplicates): ${result.transactionsSkipped}`);
console.log(`Failed: ${result.transactionsFailed}`);
```

### List Available Templates

```typescript
const templates = service.listCSVTemplates();

templates.forEach(template => {
  console.log(`${template.name} (${template.bankName})`);
  console.log(`  - Date column: ${template.dateColumn}`);
  console.log(`  - Amount column: ${template.amountColumn}`);
});
```

### Custom CSV Template

```typescript
// Register custom template
service.registerCSVTemplate({
  id: 'my-credit-union',
  name: 'My Local Credit Union',
  bankName: 'Local CU',
  accountType: 'checking',
  dateColumn: 'Trans Date',
  descriptionColumn: 'Description',
  amountColumn: 'Debit/Credit',
  dateFormat: 'MM/DD/YYYY',
  delimiter: ',',
  headerRow: 0,
});

// Use custom template
const result = await service.importFile(
  '/path/to/statement.csv',
  {
    accountId: 'cu-account',
    csvTemplateId: 'my-credit-union'
  }
);
```

## Testing

### Unit Tests (Planned)

```typescript
describe('CSVImporter', () => {
  it('should parse Chase CSV correctly', async () => {
    const importer = new CSVImporter();
    const result = await importer.import('test-data/chase.csv', {
      csvTemplate: chaseTemplate
    });
    
    expect(result.success).toBe(true);
    expect(result.transactionsImported).toBeGreaterThan(0);
  });
});

describe('OFXImporter', () => {
  it('should parse OFX 2.0 XML format', async () => {
    const importer = new OFXImporter();
    const result = await importer.import('test-data/statement.ofx');
    
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests (Planned)

```typescript
describe('AccountIntegrationService', () => {
  it('should import and deduplicate transactions', async () => {
    const service = createAccountIntegrationService();
    
    // First import
    const result1 = await service.importFile('statement1.ofx');
    expect(result1.transactionsImported).toBe(10);
    
    // Re-import same file
    const result2 = await service.importFile('statement1.ofx');
    expect(result2.transactionsSkipped).toBe(10);
    expect(result2.transactionsImported).toBe(0);
  });
});
```

## Configuration

### File Import Settings

```json
{
  "fileImport": {
    "enabled": true,
    "watchFolders": [
      "~/Downloads/BankStatements",
      "~/Documents/Finances/Imports"
    ],
    "autoImport": true,
    "archiveAfterImport": true,
    "archivePath": "~/Documents/Finances/Archive",
    "supportedFormats": ["ofx", "qfx", "csv"],
    "maxFileSize": 52428800,
    "deduplication": {
      "enabled": true,
      "strategy": "hash+fuzzy"
    }
  }
}
```

## Security Considerations

### Data Privacy

1. **Local Processing** - All file parsing happens on user's machine
2. **No Cloud Storage** - Files never uploaded to external servers
3. **Encryption at Rest** - Imported data stored encrypted in PluresDB
4. **Secure File Deletion** - Imported files securely wiped if configured

### File Validation

1. **Size Limits** - Maximum file size enforced (default 50MB for CSV, 10MB for OFX)
2. **Format Validation** - Files validated before import
3. **Error Handling** - Malformed files rejected with clear error messages
4. **Hash Verification** - File integrity checked via SHA-256

## Next Steps

### Sprint 1 (Week 1-2)
- [ ] Implement directory watcher
- [ ] Add file archival
- [ ] Create import status notifications
- [ ] Write unit tests for importers

### Sprint 2 (Week 3-4)
- [ ] Implement transaction deduplication
- [ ] Add duplicate resolution UI
- [ ] Create merge/split tools
- [ ] Integration tests

### Sprint 3 (Week 5-6)
- [ ] Template builder UI
- [ ] Community template repository
- [ ] Template import/export
- [ ] Support 20+ bank formats

### Sprint 4 (Week 7-8)
- [ ] Open Bank Project integration
- [ ] Self-hosted OBP setup guide
- [ ] Bank connector framework
- [ ] Production testing

## Success Criteria

### Phase 5 is Complete When:

1. ✅ File import framework implemented
2. ✅ CSV and OFX importers working
3. ⏳ Directory watcher functional
4. ⏳ Deduplication working correctly
5. ⏳ 20+ bank templates available
6. ⏳ Import UI complete
7. ⏳ Documentation complete
8. ⏳ Tests passing (80%+ coverage)

### Current Progress: 35%

**Completed:**
- File import framework
- CSV/OFX importers
- Template system

**Remaining:**
- Directory watcher
- Deduplication
- Enhanced templates
- OBP integration
- Import UI
- Testing

## References

- [Local-First Integration Plan](./LOCAL_FIRST_INTEGRATION_PLAN.md)
- [Privacy by Design ADR](./adr/003-privacy-by-design.md)
- [OFX Specification](https://www.ofx.net/downloads.html)
- [Open Bank Project](https://www.openbankproject.com/)

## Support

For implementation questions:
- **GitHub Issues**: https://github.com/plures/FinancialAdvisor/issues
- **Discussions**: https://github.com/plures/FinancialAdvisor/discussions
- **Documentation**: https://docs.financial-advisor.dev
