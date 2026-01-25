# ADR 004: Local-First Account Integration Strategy

**Date**: 2026-01-25  
**Status**: Accepted  
**Decision Makers**: Development Team, @kayodebristol  
**Related**: ADR-001 (MCP Integration), ADR-003 (Privacy by Design)

## Context

FinancialAdvisor needs automated account synchronization to compete with industry tools like Quicken, TurboTax, and RocketMoney. However, we must stay true to our core principles:

1. **Local-First**: User data stays on user's machine
2. **Privacy by Design**: No middlemen between user and their data (ADR-003)
3. **Open Source**: Free and open alternatives to proprietary solutions
4. **User Empowerment**: Users own 100% of their financial data

### The Middleman Problem

Traditional solutions (Plaid, Yodlee, MX) position themselves as middlemen:
- They have access to user bank credentials
- They aggregate user transaction data
- They monetize user data through analytics
- Users lose control and privacy

**We reject this model.**

### Requirements

1. **User Data Ownership**: Users must own 100% of their data
2. **No Third-Party Access**: No middleman with access to credentials or transactions
3. **Quick and Simple**: Easy for users to set up and use
4. **Automated**: Minimize manual work after initial setup
5. **Free**: No per-account or usage fees at any scale
6. **Universal**: Works with ANY bank, regardless of API support
7. **Privacy**: Aligns with ADR-003 (Privacy by Design)

## Decision

**We will implement a Local-First, File-Based Account Integration as the primary method**, with optional self-hosted automation for advanced users.

### Primary Method: File-Based Import

Users download OFX/QFX/CSV files from their banks and import them into FinancialAdvisor. The app auto-imports from a watched folder.

### Secondary Method: Self-Hosted Open Bank Project

Advanced users can self-host Open Bank Project for automated sync, maintaining complete control.

### Optional Method: Plaid Bridge

Only for users who explicitly choose convenience over privacy, with full transparency and easy opt-out.

## Rationale

### Why File-Based Import is Primary

#### Aligns with Core Values

✅ **Local-First**: Files stay on user's machine  
✅ **Privacy**: Bank never knows about our app  
✅ **User Ownership**: User controls the files  
✅ **No Middlemen**: Direct download from bank  
✅ **Free**: Zero API costs at any scale  

#### Universal Coverage

✅ **Works with ANY Bank**: If a bank exists, it likely exports OFX/CSV  
✅ **No API Needed**: Banks have been exporting files for decades  
✅ **Proven Standard**: OFX is 25+ year old open standard  
✅ **Future-Proof**: File exports won't go away  

#### Competitive Advantages

✅ **Cost**: $0 vs. Plaid's $0.30-0.60/account/month  
✅ **Privacy**: Maximum privacy vs. third-party access  
✅ **Control**: Users control timing and what data to import  
✅ **Trust**: No black box, users see the files  

#### User Experience

The workflow is actually simpler than it sounds:

1. **One-Time Setup**: User designates a folder (e.g., ~/Downloads/BankStatements)
2. **Monthly**: User downloads OFX from bank (same as paying bills online)
3. **Auto-Import**: FinancialAdvisor detects and imports automatically
4. **Done**: Transactions appear instantly

**This is what Quicken did for 30 years.** It works.

### Why Self-Hosted Open Bank Project

For users who want automation but still value privacy:

✅ **Self-Hosted**: User runs the server on their infrastructure  
✅ **Open Source**: AGPL licensed, fully auditable  
✅ **No Fees**: Free forever  
✅ **Privacy**: Data never leaves user's network  
✅ **Control**: User configures and controls everything  

### Why Plaid is Optional, Not Primary

Plaid contradicts our values:

❌ **Middleman**: Plaid sits between user and bank  
❌ **Privacy Risk**: Third-party has credentials and data  
❌ **Cost**: Expensive at scale ($600+/month at 2,000 accounts)  
❌ **Lock-in**: Hard to migrate away once users depend on it  
❌ **Trust**: Users must trust Plaid with everything  

**Plaid is only offered**:
- As an explicitly opt-in option
- With full disclosure of privacy trade-offs
- For users who prioritize convenience over privacy
- With easy migration to file-based method

## Alternatives Considered

### Alternative 1: Plaid-First (Original Plan)

**Approach**: Use Plaid as primary method, with migration to OBP later.

**Pros**:
- Fast time-to-market (1-2 weeks)
- Familiar UX (Plaid Link)
- 12,000+ institutions
- Automatic sync

**Cons**:
- ❌ Contradicts ADR-003 (Privacy by Design)
- ❌ Makes us dependent on middleman
- ❌ Expensive at scale
- ❌ Users don't own their data flow
- ❌ Goes against project vision

**Decision**: **Rejected** - Does not align with core values.

### Alternative 2: Build Our Own Scrapers

**Approach**: Screen-scrape bank websites directly.

**Pros**:
- No third-party dependency
- Automated sync
- Free

**Cons**:
- ❌ Extremely fragile (breaks when banks update sites)
- ❌ Requires storing user credentials
- ❌ Legal/ToS risks
- ❌ Months of development
- ❌ High maintenance burden
- ❌ Security risks

**Decision**: **Rejected** - Not viable.

### Alternative 3: Wait for Open Banking APIs

**Approach**: Wait for banks to offer direct APIs.

**Pros**:
- Standardized APIs
- No middlemen
- Direct bank relationship

**Cons**:
- ❌ Years away in US (Europe has PSD2, US doesn't)
- ❌ Can't wait that long
- ❌ Banks may charge for API access
- ❌ Each bank has different API

**Decision**: **Deferred** - Will adopt when available, but can't wait.

### Alternative 4: Manual Entry Only

**Approach**: Users enter all transactions manually.

**Pros**:
- Maximum privacy
- Simple implementation
- Zero dependencies

**Cons**:
- ❌ Too much manual work
- ❌ Error-prone
- ❌ Not competitive with Quicken/Mint
- ❌ Users will reject it

**Decision**: **Rejected** - Not user-friendly enough.

## Implementation Details

### Phase 1: File-Based Import (2-3 weeks)

**Week 1: OFX/QFX Import**
```typescript
class OFXImporter {
  async import(filePath: string): Promise<Transaction[]> {
    const ofxData = await this.parseOFX(filePath);
    const transactions = this.extractTransactions(ofxData);
    return this.deduplicateAndSave(transactions);
  }
}
```

**Week 2: CSV Import with Templates**
```typescript
interface CSVTemplate {
  name: string; // "Chase Checking"
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  dateFormat: string;
}

class CSVImporter {
  async import(filePath: string, template: CSVTemplate): Promise<Transaction[]> {
    // Flexible CSV parsing with bank-specific templates
  }
}
```

**Week 3: Auto-Import**
```typescript
class DirectoryWatcher {
  watch(directory: string) {
    chokidar.watch(directory).on('add', async (file) => {
      if (isFinancialFile(file)) {
        await this.autoImport(file);
      }
    });
  }
}
```

### Phase 2: PluresDB Integration

- Encrypted storage for all imported transactions
- Vector embeddings for AI categorization
- Transaction search and analytics
- Zero data leakage

### Phase 3: Self-Hosted OBP (Optional)

- Docker Compose setup for OBP
- FinancialAdvisor → OBP connector
- Self-hosting documentation
- Community bank connectors

### Phase 4: Optional Plaid Bridge (User Choice)

- Clear privacy warnings
- Full disclosure of data sharing
- Easy disable and migration
- Transparency dashboard

## Architecture

```
┌─────────────────────────────────────────┐
│         User's Machine (Local)           │
├─────────────────────────────────────────┤
│  File Import (Primary)                   │
│  ├── OFX/QFX Parser                     │
│  ├── CSV Import Engine                  │
│  ├── Directory Watcher                  │
│  └── Auto-Import Service                │
│                                         │
│  PluresDB (Encrypted Storage)           │
│  ├── Transactions                       │
│  ├── Vector Embeddings (AI)             │
│  └── Account Metadata                   │
│                                         │
│  Optional: Self-Hosted OBP              │
│  └── User's Infrastructure              │
│                                         │
│  Optional: Plaid (User Opt-In)          │
│  └── With Full Disclosure               │
└─────────────────────────────────────────┘
```

## Data Models

### ImportSource

```typescript
interface ImportSource {
  id: string;
  type: 'ofx' | 'qfx' | 'csv' | 'obp' | 'plaid' | 'manual';
  name: string;
  config: {
    // File-based
    watchFolder?: string;
    autoImport?: boolean;
    archiveAfterImport?: boolean;
    
    // CSV-specific
    template?: CSVTemplate;
    
    // OBP (self-hosted)
    obpUrl?: string;
    obpApiKey?: string; // User's own server
    
    // Plaid (optional, user opt-in)
    plaidAccessToken?: string; // Encrypted, with warning
  };
  privacyLevel: 'local' | 'self-hosted' | 'third-party';
}
```

## Consequences

### Positive

1. **Aligned with Values**: Stays true to local-first, privacy-first vision
2. **User Empowerment**: Users own their data flow completely
3. **Cost-Free**: $0 at any scale for file-based import
4. **Universal**: Works with ANY bank
5. **Privacy**: Maximum privacy, no middlemen
6. **Trust**: Users can verify what data flows where
7. **Competitive Advantage**: Differentiation from cloud-based solutions
8. **Future-Proof**: Not dependent on any third-party service
9. **Open Source**: Can improve and extend indefinitely

### Negative

1. **Manual Step**: Users must download files monthly (unless they self-host OBP)
2. **Education**: Need to teach users file import workflow
3. **Perception**: May seem "old-school" compared to Plaid
4. **Support**: Need templates for different bank CSV formats

### Mitigation Strategies

1. **Excellent UX**: Make file import incredibly easy (drag & drop)
2. **Auto-Import**: Directory watcher removes manual import step
3. **Education**: Clear tutorials and documentation
4. **Templates**: Pre-configured templates for top banks
5. **Community**: Users share CSV templates for their banks
6. **Option**: Self-hosted OBP for users who want automation
7. **Transparency**: Explain privacy benefits clearly

## Trade-offs

We explicitly choose:

- **Privacy over convenience**: File-based over automatic Plaid
- **User control over ease**: User downloads files vs. giving credentials
- **Free over features**: No cost vs. some manual work
- **Local-first over cloud**: Data stays on user's machine
- **Open source over proprietary**: OBP over Plaid
- **Long-term over short-term**: Sustainable model vs. quick solution

## Privacy Alignment (ADR-003)

This decision perfectly aligns with ADR-003:

✅ **Data Locality**: Files imported locally, stored in PluresDB  
✅ **Explicit Consent**: User explicitly downloads and imports  
✅ **Minimal Data**: Only user-chosen files imported  
✅ **Transparency**: User sees exactly what's imported  
✅ **User Control**: User controls timing and data flow  

## Success Metrics

### Phase 1 (File-Based)

- ✅ Import success rate >98% for OFX/QFX
- ✅ CSV template coverage for 50+ banks
- ✅ Auto-import accuracy >99%
- ✅ User satisfaction >4.5/5 on privacy
- ✅ Import time <2 seconds for typical file

### Phase 2 (PluresDB)

- ✅ All transactions encrypted at rest
- ✅ Zero data leakage to third parties
- ✅ Offline operation for all features
- ✅ AI categorization with local models

### Phase 3 (Self-Hosted OBP)

- ✅ Docker deployment <30 minutes
- ✅ 10+ community bank connectors
- ✅ Users rate self-hosting "easy"
- ✅ Zero cloud dependency maintained

## User Education

### Messaging

"Unlike Mint or YNAB, we don't need your bank credentials. Just download your transactions file (like you'd download a PDF statement) and drag it into FinancialAdvisor. We'll handle the rest. Your data stays on your computer, under your control."

### Tutorial

1. Log into your bank website
2. Navigate to "Download Transactions" or "Export"
3. Choose OFX or CSV format
4. Save to ~/Downloads/BankStatements
5. FinancialAdvisor auto-imports
6. Done! (Do this monthly or weekly)

## Competitive Positioning

### vs. Mint/YNAB (Plaid-based)

**FinancialAdvisor**: "We never see your bank credentials. We never access your bank account. Your data stays on your machine."

**Differentiation**: Privacy-first, local-first, user-owned data

### vs. Quicken (File-based, but proprietary)

**FinancialAdvisor**: "Like Quicken, but open source and free forever. Your data is truly yours."

**Differentiation**: Open source, free, with AI features

## Future Evolution

### When Open Banking APIs Arrive

When US banks offer standardized APIs:

1. Integrate direct bank APIs (no middlemen)
2. Still maintain file-based option
3. User chooses: File, API, or Self-Hosted
4. Privacy remains paramount

### Community Contributions

- Users share CSV templates for their banks
- Community builds OBP connectors
- Open source allows unlimited innovation
- No dependency on our team for bank coverage

## Review Schedule

- **Initial Review**: After Phase 1 completion
- **User Feedback**: Quarterly user surveys on import experience
- **Privacy Audit**: Annual review against ADR-003
- **Competitive Review**: Bi-annual assessment of alternatives

## Related Decisions

- **ADR-001**: MCP integration enables clean import architecture
- **ADR-003**: Privacy by Design is foundational to this decision
- **Future ADR**: May need decision on bank API integration when available

## Appendix A: OFX Format Overview

**OFX (Open Financial Exchange)**: Open standard for financial data exchange

- Maintained by OFX consortium
- Supported by most banks worldwide
- Two formats: OFX 1.x (SGML) and OFX 2.x (XML)
- Contains: Transactions, balances, account info
- Widely used by Quicken, Money, GnuCash

**QFX**: Quicken's flavor of OFX, mostly compatible

## Appendix B: CSV Template System

**Pre-configured templates for common banks**:

```typescript
const templates = {
  chase_checking: {
    name: "Chase Checking",
    dateColumn: "Posting Date",
    descriptionColumn: "Description",
    amountColumn: "Amount",
    dateFormat: "MM/DD/YYYY"
  },
  bankofamerica: {
    name: "Bank of America",
    dateColumn: 0,
    descriptionColumn: 2,
    amountColumn: 3,
    dateFormat: "MM/DD/YYYY"
  }
  // ... 50+ more
};
```

## Appendix C: Cost Comparison

**At 10,000 active users (20,000 accounts)**:

| Approach | Monthly Cost |
|----------|--------------|
| File-Based (Ours) | $0 |
| Self-Hosted OBP | $0 (users pay for own servers) |
| Plaid | $6,000 - $12,000 |
| Yodlee | $10,000 - $20,000 |

**Savings over 3 years**: $216,000 - $432,000 (vs. Plaid)

## Conclusion

**This decision empowers users, respects privacy, and costs nothing.**

We're proving that local-first, privacy-first software can compete with and exceed proprietary, cloud-based alternatives. This is our competitive advantage.

File-based import with PluresDB storage demonstrates that we don't need middlemen to build excellent financial software. Users control their data, we control our costs, and together we prove that open source can win.

**Let's build software that serves users, not middlemen.**

---

**Approved**: 2026-01-25  
**Next Review**: After Phase 1 completion  
**Status**: Accepted and Aligned with Project Vision
