# Local-First Account Integration Plan

## Vision & Principles

FinancialAdvisor is a local-first, open-source project that empowers users to own their financial data. We reject the middleman model where user data becomes a commodity. Instead, we build tools that prove local-first is not only viable but superior.

### Core Principles

1. **User Data Ownership**: Users own 100% of their financial data
2. **No Middlemen**: No third parties stand between users and their data
3. **Local-First**: All data stored locally by default using PluresDB
4. **Privacy by Design**: Per ADR-003, privacy is foundational, not optional
5. **Open Source**: Free and open alternatives to proprietary solutions
6. **Self-Hosting**: Users can run everything on their own infrastructure

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local-First Account Sync](#local-first-account-sync)
3. [Open-Source Solutions](#open-source-solutions)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Security & Privacy](#security--privacy)
6. [Testing Strategy](#testing-strategy)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Machine (Full Control)             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FinancialAdvisor Desktop App (Tauri)                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Frontend (SvelteKit)                                │   │
│  │  ├── File Import UI (OFX/QFX/CSV)                   │   │
│  │  ├── Manual Entry Interface                          │   │
│  │  ├── Sync Status Dashboard                          │   │
│  │  └── Account Management                              │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  AccountSyncService (Local-First)                    │   │
│  │  ├── OFXImporter                                     │   │
│  │  ├── QFXImporter                                     │   │
│  │  ├── CSVImporter                                     │   │
│  │  ├── DirectoryWatcher (auto-import)                 │   │
│  │  └── TransactionDeduplicator                        │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  PluresDB (Local-First Database)                     │   │
│  │  ├── Encrypted Storage (AES-256)                    │   │
│  │  ├── Vector Search (AI features)                    │   │
│  │  ├── Real-time Sync (optional p2p)                  │   │
│  │  └── Transaction History                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Optional Self-Hosted Services (User's Infrastructure)       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Open Bank Project Server (Self-Hosted)               │   │
│  │  ├── Bank Connectors (User Configures)              │   │
│  │  ├── Direct Bank APIs (No Plaid)                    │   │
│  │  └── Local API Gateway                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │
          │ (Optional, User-Controlled Only)
          ▼
    ┌──────────────┐
    │ User's Bank  │ ← Direct connection, no middlemen
    │ Website      │   (User downloads files directly)
    └──────────────┘
```

## Local-First Account Sync

### Primary Method: File-Based Import (Phase 1)

**Philosophy**: Users download files from their banks directly. We import them. Zero middlemen.

#### Supported Formats

1. **OFX (Open Financial Exchange)**
   - Industry standard, supported by most banks
   - Download from bank website monthly/weekly
   - Auto-import from designated folder

2. **QFX (Quicken Financial Exchange)**
   - Quicken's OFX variant
   - Widely supported by banks
   - Import compatible with OFX

3. **CSV (Comma-Separated Values)**
   - Universal export format
   - Flexible mapping for different bank formats
   - Template system for common banks

#### Auto-Import Workflow

```typescript
// User's workflow
1. User designates a folder: ~/Downloads/BankStatements
2. User downloads OFX/QFX/CSV from bank website
3. FileWatcher detects new files
4. AccountSyncService auto-imports
5. Transactions appear in FinancialAdvisor
6. Files optionally archived/encrypted
```

#### Benefits

✅ **No Third Parties**: User downloads directly from bank  
✅ **Complete Control**: User owns the files  
✅ **Works Offline**: No internet needed after download  
✅ **Privacy**: Bank never knows about our app  
✅ **Free**: Zero API costs  
✅ **Universal**: Works with ANY bank that exports files  

### Secondary Method: Self-Hosted Open Bank Project (Phase 2)

**For Advanced Users**: Self-host Open Bank Project for automated sync.

#### Setup

```bash
# User runs on their own server/NAS
docker-compose up -d openbankproject

# Configure bank connectors (one-time setup)
# Connect FinancialAdvisor to self-hosted OBP
```

#### Benefits

✅ **Self-Hosted**: User runs the server  
✅ **Open Source**: AGPL licensed  
✅ **No Fees**: Free forever  
✅ **Privacy**: Data never leaves user's infrastructure  
✅ **Automated**: Daily sync without manual file downloads  

### Optional Method: Plaid Bridge (Phase 3, User-Controlled)

**For Users Who Choose Convenience**: Optional Plaid integration with FULL transparency.

#### Critical Requirements

1. **Not Default**: Must be explicitly enabled by user
2. **Full Disclosure**: Clear explanation that data goes through Plaid
3. **Easy Disable**: One-click to disconnect and delete credentials
4. **Data Transparency**: Show exactly what Plaid accesses
5. **Migration Path**: Easy export to file-based or OBP methods

#### User Consent Flow

```
┌─────────────────────────────────────────┐
│ Enable Plaid Integration?               │
├─────────────────────────────────────────┤
│ ⚠️  IMPORTANT: Plaid is a third-party   │
│    service that will access your bank   │
│    credentials and transaction data.    │
│                                         │
│ ✅ Local-First Alternative Available:   │
│    Use file-based import (OFX/CSV) for  │
│    complete privacy and data ownership. │
│                                         │
│ Choose your method:                     │
│  ○ File-Based (Recommended)             │
│  ○ Self-Hosted Open Bank Project        │
│  ○ Plaid (Convenience, Less Privacy)    │
└─────────────────────────────────────────┘
```

## Open-Source Solutions

### OFX/QFX Parser

Use existing open-source libraries:

**Option 1: ofxtools (Python)**
```python
# Python library for OFX parsing
pip install ofxtools
```

**Option 2: node-ofx-parser (Node.js)**
```javascript
// JavaScript library for OFX parsing
npm install ofx-parser
```

**Option 3: Build Our Own (TypeScript)**
- Full control over parsing
- TypeScript native
- Optimize for our use case

### CSV Import Engine

**Flexible Mapping System**:
```typescript
interface CSVTemplate {
  name: string; // "Chase Checking", "Bank of America"
  dateColumn: string | number;
  descriptionColumn: string | number;
  amountColumn: string | number;
  dateFormat: string; // "MM/DD/YYYY", "YYYY-MM-DD"
  amountFormat: string; // "1,234.56", "1234.56"
  headerRow?: number;
}
```

### File Watcher

Use `chokidar` (proven, lightweight):
```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch('~/Downloads/BankStatements', {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true
});

watcher.on('add', async (path) => {
  if (isFinancialFile(path)) {
    await importFile(path);
  }
});
```

### Open Bank Project

**Self-Hosted Option**:
```yaml
# docker-compose.yml
version: '3'
services:
  obp:
    image: openbankproject/obp-full
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/obp
    volumes:
      - ./connectors:/opt/obp/connectors
```

## Implementation Roadmap

### Phase 1: File-Based Import (2-3 weeks) ✅ PRIMARY

**Week 1: OFX/QFX Import**
- [x] Research OFX format specification
- [ ] Implement OFX parser (or integrate library)
- [ ] Create OFX transaction mapper
- [ ] Add file import UI
- [ ] Test with sample OFX files from major banks

**Week 2: CSV Import with Templates**
- [ ] Build flexible CSV parser
- [ ] Create template system for bank-specific formats
- [ ] Add template management UI
- [ ] Pre-configure templates for top 10 US banks
- [ ] Test with real CSV exports

**Week 3: Auto-Import & Polish**
- [ ] Implement directory watcher
- [ ] Add transaction deduplication
- [ ] Create import history tracking
- [ ] Add file archive/encryption
- [ ] User testing and refinement

**Deliverables**:
- Users can import OFX/QFX/CSV files
- Auto-import from watched folder
- Template system for CSV formats
- Zero third-party dependencies

### Phase 2: Enhanced Features (2-3 weeks)

**Week 1: Transaction Intelligence**
- [ ] Smart categorization from file metadata
- [ ] Duplicate detection across imports
- [ ] Balance reconciliation
- [ ] Import conflict resolution

**Week 2: PluresDB Integration**
- [ ] Encrypted transaction storage
- [ ] Vector embeddings for AI categorization
- [ ] Transaction search and filtering
- [ ] Historical data analytics

**Week 3: UI/UX Polish**
- [ ] Import wizard for first-time users
- [ ] Drag-and-drop file import
- [ ] Import status notifications
- [ ] Template sharing (community templates)

### Phase 3: Self-Hosted Open Bank Project (4-6 weeks)

**For Advanced Users Who Want Automation**

- [ ] OBP Docker Compose setup guide
- [ ] FinancialAdvisor → OBP connector
- [ ] Bank connector configuration UI
- [ ] Self-hosting documentation
- [ ] Community bank connector repository

### Phase 4: Optional Plaid Bridge (2-3 weeks)

**Only If User Explicitly Requests**

- [ ] Plaid provider with FULL disclosure
- [ ] Clear consent and privacy warnings
- [ ] Easy disable/delete mechanism
- [ ] Migration tools to file-based
- [ ] Transparency dashboard (show what Plaid accesses)

## Data Models

### ImportSource

```typescript
interface ImportSource {
  id: string;
  type: 'ofx' | 'qfx' | 'csv' | 'obp' | 'plaid' | 'manual';
  name: string; // "Chase Checking Monthly Export"
  config: {
    // For file-based
    filePath?: string;
    watchFolder?: string;
    autoImport?: boolean;
    archiveAfterImport?: boolean;
    
    // For CSV
    template?: CSVTemplate;
    
    // For OBP
    obpUrl?: string;
    obpAccountId?: string;
    
    // For Plaid (optional)
    plaidItemId?: string;
    plaidAccessToken?: string; // Encrypted, with warning
  };
  lastImportAt?: Date;
  nextImportAt?: Date;
  enabled: boolean;
}
```

### ImportHistory

```typescript
interface ImportHistory {
  id: string;
  sourceId: string;
  type: 'ofx' | 'qfx' | 'csv' | 'obp' | 'plaid';
  fileName?: string;
  importedAt: Date;
  transactionsImported: number;
  transactionsSkipped: number; // duplicates
  errors: string[];
  status: 'success' | 'partial' | 'failed';
  fileHash?: string; // Prevent re-importing same file
}
```

## Security & Privacy

### File-Based Import Security

1. **File Validation**
   - Verify file format before parsing
   - Scan for malicious content
   - Size limits to prevent DoS

2. **Encryption at Rest**
   - Imported files encrypted with AES-256
   - PluresDB encrypted storage
   - User-controlled encryption key

3. **Secure Archival**
   - Encrypted archive of imported files
   - Optional auto-delete after X days
   - Secure deletion (overwrite)

4. **No Data Leakage**
   - No telemetry on imported data
   - No analytics on transactions
   - No third-party tracking

### Self-Hosted OBP Security

1. **User Infrastructure**
   - Runs on user's server
   - User controls all security
   - We provide secure defaults

2. **Connection Security**
   - TLS 1.3 for FinancialAdvisor ↔ OBP
   - Certificate pinning
   - No data leaves user's network

### Optional Plaid Security

**Only applies if user explicitly enables Plaid**

1. **Full Transparency**
   - Clear disclosure before enabling
   - Show what data Plaid accesses
   - Easy to disable and delete

2. **Encrypted Storage**
   - Plaid tokens encrypted in PluresDB
   - User can delete all Plaid data
   - Migration tools to switch to file-based

## Testing Strategy

### Unit Tests

```typescript
describe('OFXImporter', () => {
  it('should parse OFX 1.0 format');
  it('should parse OFX 2.0 XML format');
  it('should extract transactions correctly');
  it('should handle malformed OFX gracefully');
});

describe('CSVImporter', () => {
  it('should apply template mapping');
  it('should detect date format');
  it('should handle various amount formats');
  it('should skip header rows');
});

describe('TransactionDeduplicator', () => {
  it('should detect duplicate transactions');
  it('should match by ID if available');
  it('should match by date+amount+description');
  it('should handle pending vs posted');
});
```

### Integration Tests

```typescript
describe('File Import Flow', () => {
  it('should import real Chase OFX export');
  it('should import real BofA CSV export');
  it('should auto-import from watched folder');
  it('should deduplicate across multiple imports');
});
```

### User Acceptance Testing

- Import files from top 10 US banks
- Test CSV templates with real exports
- Verify auto-import workflow
- Validate deduplication accuracy

## User Experience

### First-Time Setup

```
┌───────────────────────────────────────┐
│ Welcome to FinancialAdvisor!          │
├───────────────────────────────────────┤
│ How would you like to add accounts?   │
│                                       │
│ ○ Import files from my bank           │
│   (Recommended - Most Private)        │
│   • Download OFX/CSV from bank        │
│   • Drop files here or auto-import   │
│   • Works with ANY bank               │
│                                       │
│ ○ Enter transactions manually         │
│   (Full control)                      │
│                                       │
│ ○ Self-host Open Bank Project         │
│   (Advanced - Automated sync)         │
│                                       │
│ ○ Use Plaid (requires third-party)    │
│   (Less private, more convenient)     │
└───────────────────────────────────────┘
```

### Import Workflow

1. **One-Time**: User downloads OFX/CSV from bank website
2. **Drag & Drop**: User drops file into FinancialAdvisor
3. **Auto-Detect**: App detects format and bank
4. **Import**: Transactions imported, duplicates skipped
5. **Verify**: User reviews imported transactions
6. **Done**: Transactions saved in PluresDB

### Auto-Import Setup

```
┌───────────────────────────────────────┐
│ Setup Auto-Import                     │
├───────────────────────────────────────┤
│ Watch Folder:                         │
│ [~/Downloads/BankStatements    ]  📁  │
│                                       │
│ When new files appear:                │
│ ☑ Automatically import                │
│ ☑ Move to archive after import        │
│ ☐ Delete original file                │
│                                       │
│ Supported formats:                    │
│ • .ofx, .qfx (all banks)              │
│ • .csv (with template)                │
│                                       │
│        [Cancel]  [Save Settings]      │
└───────────────────────────────────────┘
```

## Cost Analysis

### File-Based Import

**Infrastructure**: FREE (runs locally)  
**API Costs**: $0/month (no APIs)  
**User Cost**: FREE (open source)  
**Maintenance**: Minimal (mature OFX standard)  

**At 10,000 users**: Still $0/month

### Self-Hosted OBP

**Infrastructure**: $0-50/month (user's choice - NAS, VPS, or Raspberry Pi)  
**Development**: One-time setup  
**User Cost**: User pays for their own server (their choice)  
**Scalability**: Unlimited (self-hosted)

### Optional Plaid

**Only if user enables** (~5% of users might choose this)

**At 500 Plaid users**: ~$150-300/month  
**At 2,000 Plaid users**: ~$600-1,200/month  

**Mitigation**: Encourage file-based or OBP alternatives

## Competitive Analysis

### vs. Plaid-First Approach

| Aspect | File-Based (Ours) | Plaid-First |
|--------|-------------------|-------------|
| Privacy | ✅ Maximum | ❌ Third-party access |
| Cost | ✅ $0 | ❌ $0.30-0.60/account |
| User Control | ✅ Complete | ❌ Plaid has data |
| Bank Coverage | ✅ ANY bank | ⚠️ 12,000+ |
| Setup | ⚠️ Manual download | ✅ 3-click |
| Automation | ⚠️ Requires OBP | ✅ Automatic |

### vs. Quicken/Mint

| Aspect | FinancialAdvisor | Quicken/Mint |
|--------|-----------------|--------------|
| Data Ownership | ✅ User owns | ❌ Company owns |
| Privacy | ✅ Local-first | ❌ Cloud-based |
| Cost | ✅ Free | ❌ $50-100/year |
| Open Source | ✅ Yes | ❌ No |
| Self-Hosted | ✅ Yes | ❌ No |

## Success Metrics

### Phase 1 (File-Based)

- ✅ Import OFX/QFX from top 20 US banks successfully
- ✅ CSV template coverage for 80% of user banks
- ✅ Auto-import accuracy >99%
- ✅ Deduplication accuracy >98%
- ✅ User satisfaction >4.5/5 on privacy

### Phase 2 (PluresDB Integration)

- ✅ All transactions encrypted at rest
- ✅ Vector search enables AI categorization
- ✅ Zero data leakage to third parties
- ✅ Offline operation for all features

### Phase 3 (Self-Hosted OBP)

- ✅ Docker deployment <30 minutes
- ✅ 10+ community bank connectors
- ✅ Self-hosting guide rated "easy" by users
- ✅ Zero cloud dependency

## Conclusion

This local-first approach:

1. ✅ **Empowers Users**: Complete data ownership
2. ✅ **Respects Privacy**: No middlemen by default
3. ✅ **Costs Nothing**: Free forever at any scale
4. ✅ **Works Universally**: ANY bank that exports files
5. ✅ **Aligns with Vision**: Local-first, open-source
6. ✅ **Proves Superiority**: Local-first IS better

We don't need Plaid to build great software. We have the tools (PluresDB, open standards, self-hosting) to give users complete control. That's our competitive advantage.

**Let's build software that serves users, not middlemen.**

---

**Status**: Planning Complete, Ready for Implementation  
**Next**: Phase 1 - File-Based Import (OFX/QFX/CSV)  
**Timeline**: 2-3 weeks to functional file import  
**Cost**: $0 at any scale
