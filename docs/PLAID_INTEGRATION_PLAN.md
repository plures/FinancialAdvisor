# Plaid Integration Plan

## Executive Summary

This document outlines the plan, design, and implementation approach for integrating automated account synchronization into FinancialAdvisor. The goal is to enable users to easily connect their financial accounts and keep them synchronized automatically, similar to industry tools like Quicken, TurboTax, and RocketMoney.

## Table of Contents

1. [Research & Analysis](#research--analysis)
2. [Solution Comparison](#solution-comparison)
3. [Recommended Approach](#recommended-approach)
4. [Architecture Design](#architecture-design)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Security & Privacy](#security--privacy)
7. [Testing Strategy](#testing-strategy)
8. [Future Enhancements](#future-enhancements)

## Research & Analysis

### Industry Standard: Plaid

**Plaid** is the leading financial data aggregation service in North America, used by companies like Venmo, Robinhood, Acorns, and thousands of others.

#### Plaid Features
- **Account Aggregation**: Connect to 12,000+ financial institutions
- **Transaction Sync**: Automatic transaction import and categorization
- **Balance Updates**: Real-time account balance synchronization
- **Identity Verification**: Enhanced security with OAuth 2.0
- **Investment Tracking**: Support for brokerage accounts
- **Liabilities**: Loan and credit card tracking

#### Plaid Pricing (2026)
- **Sandbox**: Unlimited calls, test data only (FREE)
- **Limited Production**: 200 API calls with real data (FREE)
- **Full Production**: Usage-based pricing, requires approval
  - Per-account charges
  - Different rates for different products (Auth, Transactions, Identity, etc.)
  - Custom pricing for scale

#### Plaid Technical Stack
- **Backend**: Node.js SDK (`plaid` npm package)
- **Frontend**: Plaid Link (CDN-based JavaScript library)
- **Authentication**: OAuth 2.0 with token exchange
- **API Coverage**: US, Canada, UK, EU (via PSD2 Open Banking)

### Open-Source Alternatives

#### 1. Open Bank Project (OBP) ⭐ RECOMMENDED FOR SELF-HOSTING

**Overview**: The most mature open-source banking API middleware platform.

**Pros**:
- ✅ Truly open source (AGPL license)
- ✅ Self-hosted with full control
- ✅350+ RESTful APIs
- ✅ Active development and community
- ✅ Global coverage through connector system
- ✅ No per-account fees or usage limits
- ✅ Complete data privacy (no third-party access)

**Cons**:
- ❌ Requires technical setup (Java/Scala backend)
- ❌ Smaller institution coverage than Plaid
- ❌ Manual connector configuration needed
- ❌ No pre-built UI like Plaid Link

**Technical Stack**:
- Backend: Scala/Java (can be Dockerized)
- Frontend: TypeScript/JavaScript REST API clients
- Database: PostgreSQL/MySQL
- Auth: OAuth 1.0a, OAuth 2.0, DirectLogin

#### 2. Nordigen (GoCardless) - European Focus

**Overview**: Free open banking API for Europe, acquired by GoCardless.

**Pros**:
- ✅ Free API for European banks
- ✅ PSD2/SEPA compliant
- ✅ Public SDKs and documentation
- ✅ Good for EU/UK coverage

**Cons**:
- ❌ Europe-only (limited North America support)
- ❌ Commercial support through GoCardless
- ❌ Less control than fully self-hosted

#### 3. Tink, TrueLayer, BankingSDK

**Overview**: Commercial alternatives with developer-friendly APIs.

**Pros**:
- ✅ Strong EU/UK coverage
- ✅ PSD2 compliance
- ✅ Good documentation

**Cons**:
- ❌ Not open source
- ❌ Commercial pricing models
- ❌ Limited US coverage

## Solution Comparison

| Solution | Cost | Coverage | Open Source | Privacy | Setup Complexity | Recommendation |
|----------|------|----------|-------------|---------|-----------------|----------------|
| **Plaid** | Free tier + paid | Best (12K+ US institutions) | ❌ | Data shared | Low | ⭐ For MVP/Quick Start |
| **Open Bank Project** | FREE | Good (manual setup) | ✅ | Full control | Medium-High | ⭐⭐ For Production |
| **Nordigen** | FREE | EU/UK only | Partial | Some control | Low | Europe only |
| **Self-built Scrapers** | FREE | Custom | ✅ | Full control | Very High | Not recommended |

## Recommended Approach

### Phase 1: MVP with Plaid (Quick Start) ✅

**Why Start with Plaid**:
1. **Fast Time to Market**: Integrate in days, not months
2. **Free Development**: 200 API calls for testing with real accounts
3. **Proven Solution**: Industry standard, well-documented
4. **User Experience**: Plaid Link provides familiar, trusted UI
5. **Reasonable Defaults**: As requested - simple, automated, minimal user friction

**Limitations to Accept Initially**:
- Usage limits (200 free calls)
- Per-account costs at scale
- Third-party data dependency
- Limited to supported institutions

### Phase 2: Migration Path to Open Bank Project (Long-term)

**Why Plan for OBP**:
1. **Cost at Scale**: No per-account fees
2. **Privacy by Design**: All data stays local
3. **Full Control**: Self-hosted, customizable
4. **Open Source**: Aligns with project values
5. **Future-Proof**: Not locked into vendor pricing

**Migration Strategy**:
- Abstract integration behind service interface
- Support multiple providers simultaneously
- Allow users to choose their integration method
- Provide migration tools to move from Plaid to OBP

## Architecture Design

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    FinancialAdvisor App                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (SvelteKit + VSCode Extension)                    │
│  ├── Account Connection UI (Plaid Link / OBP Auth)         │
│  ├── Sync Status Display                                    │
│  └── Settings & Configuration                               │
├─────────────────────────────────────────────────────────────┤
│  Backend Layer (Tauri + MCP Server)                         │
│  ├── AccountIntegrationService (Abstract Interface)         │
│  │   ├── PlaidProvider (implements AccountProvider)         │
│  │   └── OBPProvider (implements AccountProvider)           │
│  ├── AccountSyncService                                     │
│  │   ├── Sync Scheduler                                     │
│  │   ├── Transaction Import                                 │
│  │   └── Balance Update                                     │
│  ├── TokenStorageService (Secure)                           │
│  └── MCP Tools                                              │
│      ├── connect_account                                    │
│      ├── sync_accounts                                      │
│      ├── disconnect_account                                 │
│      └── get_sync_status                                    │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (PluresDB + SQLite)                             │
│  ├── Account Connections Table                              │
│  ├── Access Tokens (Encrypted)                              │
│  ├── Sync History                                           │
│  └── Imported Transactions                                  │
└─────────────────────────────────────────────────────────────┘
          │                              │
          │ Plaid API                    │ OBP API
          ▼                              ▼
    ┌──────────┐                  ┌──────────────┐
    │  Plaid   │                  │ Open Bank    │
    │  Cloud   │                  │ Project      │
    │  Service │                  │ (Self-hosted)│
    └──────────┘                  └──────────────┘
          │                              │
          ▼                              ▼
    User's Banks                   User's Banks
```

### Data Models

#### AccountConnection

```typescript
interface AccountConnection {
  id: string;
  accountId: string; // Reference to Account in main DB
  provider: 'plaid' | 'obp' | 'manual';
  providerAccountId: string; // External account ID
  institutionId: string;
  institutionName: string;
  accessToken: string; // Encrypted
  itemId?: string; // Plaid-specific
  lastSyncAt: Date;
  syncStatus: 'active' | 'error' | 'disconnected';
  syncError?: string;
  autoSync: boolean;
  syncFrequency: 'daily' | 'weekly' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}
```

#### SyncHistory

```typescript
interface SyncHistory {
  id: string;
  connectionId: string;
  syncType: 'full' | 'incremental';
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'partial' | 'failed';
  transactionsImported: number;
  balanceUpdated: boolean;
  errors: string[];
}
```

### Service Interfaces

#### AccountProvider Interface

```typescript
interface AccountProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Initialize link/auth flow
   * Returns URL or token to start connection process
   */
  createLinkToken(userId: string): Promise<string>;

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
}
```

### MCP Server Tools

#### `connect_account`

```typescript
{
  name: "connect_account",
  description: "Connect a financial account via Plaid or OBP",
  inputSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        enum: ["plaid", "obp"],
        description: "Account integration provider"
      }
    },
    required: ["provider"]
  }
}
```

Returns a link token or authorization URL for the user to complete the connection flow.

#### `sync_accounts`

```typescript
{
  name: "sync_accounts",
  description: "Synchronize connected accounts and import new transactions",
  inputSchema: {
    type: "object",
    properties: {
      accountIds: {
        type: "array",
        items: { type: "string" },
        description: "Specific account IDs to sync (empty for all)"
      },
      force: {
        type: "boolean",
        description: "Force sync even if recently synced"
      }
    }
  }
}
```

#### `disconnect_account`

```typescript
{
  name: "disconnect_account",
  description: "Disconnect an integrated account",
  inputSchema: {
    type: "object",
    properties: {
      connectionId: {
        type: "string",
        description: "Account connection ID to disconnect"
      }
    },
    required: ["connectionId"]
  }
}
```

#### `get_sync_status`

```typescript
{
  name: "get_sync_status",
  description: "Get synchronization status for connected accounts",
  inputSchema: {
    type: "object",
    properties: {
      connectionId: {
        type: "string",
        description: "Optional connection ID for specific status"
      }
    }
  }
}
```

## Implementation Roadmap

### Phase 1A: Foundation & Planning (Current)

**Duration**: 1-2 days

- [x] Research Plaid and alternatives
- [x] Document architecture and plan
- [ ] Set up Plaid developer account
- [ ] Review security requirements
- [ ] Define data models

### Phase 1B: Plaid Integration - Backend (Week 1)

**Duration**: 3-5 days

**Tasks**:
1. Add Plaid SDK dependency
2. Create `AccountProvider` interface
3. Implement `PlaidProvider` class
   - Link token creation
   - Token exchange
   - Account fetching
   - Transaction retrieval
   - Balance updates
4. Create `TokenStorageService` with encryption
5. Update database schema for account connections
6. Add MCP server tools:
   - `connect_account`
   - `sync_accounts`
   - `disconnect_account`
   - `get_sync_status`

**Deliverables**:
- Plaid provider fully functional
- Secure token storage
- MCP tools operational

### Phase 1C: Plaid Integration - Frontend (Week 2)

**Duration**: 3-5 days

**Tasks**:
1. Add Plaid Link to Svelte app
2. Create account connection flow UI
3. Add sync status display
4. Implement VSCode extension commands:
   - "Connect Account via Plaid"
   - "Sync Connected Accounts"
   - "View Account Connections"
5. Add notification system for sync events
6. Create settings panel for sync configuration

**Deliverables**:
- Working UI for connecting accounts
- Real-time sync status
- User-friendly error messages

### Phase 1D: Account Synchronization (Week 3)

**Duration**: 3-5 days

**Tasks**:
1. Implement `AccountSyncService`
2. Create sync scheduler with configurable intervals
3. Build transaction import with deduplication
4. Implement balance update mechanism
5. Add conflict resolution for manual vs. imported data
6. Create background sync worker
7. Add retry logic and error recovery

**Deliverables**:
- Automated daily sync
- Transaction deduplication
- Intelligent conflict resolution

### Phase 1E: Testing & Refinement (Week 4)

**Duration**: 3-5 days

**Tasks**:
1. Write unit tests for providers
2. Create integration tests with Plaid sandbox
3. Test error scenarios and recovery
4. Performance testing with large transaction sets
5. Security audit of token storage
6. User testing and feedback
7. Documentation updates

**Deliverables**:
- Test coverage >80%
- Security validation
- User documentation

### Phase 2: Open Bank Project Integration (Future)

**Duration**: 4-6 weeks (scheduled for Q2 2026)

**Tasks**:
1. Set up OBP server (Docker deployment)
2. Create `OBPProvider` implementation
3. Build custom bank connectors
4. Implement OBP authentication flows
5. Migration tool from Plaid to OBP
6. User choice UI for provider selection
7. Documentation for self-hosting

**Deliverables**:
- Functional OBP integration
- Provider abstraction working
- Migration tools
- Self-hosting guide

## Security & Privacy

### Security Measures

#### 1. Token Encryption
- All access tokens encrypted at rest using AES-256
- Encryption key stored separately (env variable or system keyring)
- Never log or expose tokens in plain text

#### 2. Secure Communication
- All API calls over HTTPS/TLS 1.3
- Certificate pinning for critical endpoints
- Request signing where supported

#### 3. Minimal Permissions
- Request only necessary Plaid scopes
- Implement least-privilege access
- Allow users to revoke access anytime

#### 4. Data Privacy
- Transactions stored locally only
- No data shared with third parties (except Plaid when using that provider)
- Option to disable cloud sync entirely
- Clear data retention policies

#### 5. Audit Trail
- Log all connection/disconnection events
- Track all sync operations
- Maintain security event log

### Privacy by Design Principles

1. **Local-First**: Default to local storage, OBP for users who want it
2. **User Control**: Clear settings for what data to sync
3. **Transparency**: Show exactly what data is accessed
4. **Minimal Data**: Only sync necessary transaction details
5. **Right to Disconnect**: One-click account disconnection
6. **Data Export**: Allow users to export all their data

### Compliance Considerations

- **GDPR** (EU users): Right to erasure, data portability
- **CCPA** (California users): Data disclosure, opt-out rights
- **PCI DSS**: Not directly applicable (no card data stored)
- **SOC 2**: Consider for enterprise deployments

## Testing Strategy

### Unit Tests

```typescript
// Example test structure
describe('PlaidProvider', () => {
  describe('createLinkToken', () => {
    it('should create valid link token');
    it('should handle API errors gracefully');
    it('should include required parameters');
  });

  describe('getTransactions', () => {
    it('should fetch transactions for date range');
    it('should handle pagination correctly');
    it('should map Plaid transactions to internal format');
    it('should handle empty results');
  });
});
```

### Integration Tests

1. **Plaid Sandbox Tests**
   - Connection flow end-to-end
   - Transaction import with test data
   - Balance updates
   - Error handling

2. **Database Tests**
   - Token storage and retrieval
   - Sync history tracking
   - Connection management

3. **Sync Service Tests**
   - Scheduled sync execution
   - Deduplication logic
   - Conflict resolution

### Manual Testing Checklist

- [ ] Connect account via Plaid Link
- [ ] Verify accounts appear correctly
- [ ] Sync transactions successfully
- [ ] Balance updates reflect correctly
- [ ] Disconnect and verify cleanup
- [ ] Test with multiple accounts
- [ ] Test sync scheduling
- [ ] Verify error notifications
- [ ] Test manual sync trigger
- [ ] Validate encrypted token storage

## User Experience Flow

### Initial Setup

1. User navigates to Accounts section
2. Clicks "Connect Account" button
3. Selects provider (Plaid initially, OBP later)
4. Plaid Link modal opens
5. User searches for their bank
6. Enters credentials (directly with Plaid, never stored by us)
7. Selects accounts to connect
8. Returns to app with accounts added
9. Initial sync starts automatically

### Ongoing Sync

1. Background sync runs daily (configurable)
2. User sees sync status indicator
3. Notifications for new transactions (optional)
4. Manual sync button for immediate update
5. Error notifications with clear next steps

### Account Management

1. View all connected accounts
2. See last sync time
3. Force sync button
4. Disconnect button
5. Sync history log
6. Provider switch option (future)

## Error Handling & Recovery

### Proactive Error Prevention

1. **Pre-sync Validation**
   - Check token validity before sync
   - Verify network connectivity
   - Validate date ranges

2. **Rate Limiting**
   - Respect Plaid API limits
   - Implement exponential backoff
   - Queue sync requests

3. **Graceful Degradation**
   - Fall back to manual entry if sync fails
   - Partial sync completion handling
   - Preserve existing data on error

### Error Scenarios

| Error | User Impact | Recovery Strategy |
|-------|-------------|-------------------|
| Invalid token | Sync fails | Prompt re-authentication |
| Network timeout | Delayed sync | Auto-retry with backoff |
| API rate limit | Sync queued | Schedule retry, notify user |
| Institution maintenance | Temporary failure | Auto-retry next cycle |
| Account closed | Sync permanently fails | Notify user, suggest disconnection |
| Insufficient permissions | Limited data | Request permission upgrade |

### User-Friendly Error Messages

Instead of: `Error 401: Unauthorized`
Show: "Your bank connection expired. Click here to reconnect your account."

Instead of: `ITEM_LOGIN_REQUIRED`
Show: "Your bank requires you to log in again. This is normal for security. Reconnect now?"

## Future Enhancements

### Short-term (Phase 1 Extensions)

1. **Smart Categorization**
   - Use AI to categorize imported transactions
   - Learn from user corrections
   - Suggest categories for new merchants

2. **Duplicate Detection**
   - Advanced matching algorithm
   - Handle pending vs. posted transactions
   - Merge similar transactions

3. **Multi-Account Transfers**
   - Detect transfers between connected accounts
   - Auto-create matching transfer records
   - Balance reconciliation

### Medium-term (Phase 2+)

1. **Investment Account Support**
   - Import holdings and positions
   - Track cost basis
   - Performance analytics

2. **Bill Detection**
   - Identify recurring bills
   - Predict upcoming expenses
   - Bill reminders

3. **Credit Card Optimization**
   - Payment due date tracking
   - Interest calculation
   - Payoff strategies

### Long-term (Phase 3+)

1. **Open Banking Protocol Support**
   - Native PSD2 integration (Europe)
   - FDX support (North America)
   - Future regulatory compliance

2. **Bank-Level Integrations**
   - Direct bank partnerships
   - Custom connectors for major banks
   - Real-time balance webhooks

3. **Predictive Analytics**
   - Cash flow forecasting
   - Spending predictions
   - Savings recommendations

## Cost Analysis

### Plaid Costs (Production)

**Assumptions**:
- 1,000 active users
- Average 2 accounts per user
- Daily sync frequency

**Estimated Costs**:
- Auth product: $0.05-0.25 per account/month
- Transactions product: $0.30-0.60 per account/month
- Total: ~$700-1,700/month at 2,000 accounts

**Break-even Analysis**:
- At 2,000 connected accounts: Consider OBP
- Self-hosted OBP cost: ~$50-200/month (server + maintenance)
- Savings: ~$500-1,500/month at scale

### Open Bank Project Costs

**Infrastructure**:
- VPS/Cloud server: $20-100/month
- Database: $10-50/month
- Monitoring: $10-30/month
- **Total**: $40-180/month

**Development**:
- Initial setup: 4-6 weeks
- Maintenance: 2-4 hours/week
- Connector development: As needed per bank

**Break-even**: ~200-500 connected accounts

## Conclusion

This plan provides a pragmatic path to implementing automated account integration:

1. **Start with Plaid** for quick MVP and proven user experience
2. **Abstract the integration** to support multiple providers
3. **Plan migration to OBP** for long-term cost savings and privacy
4. **Maintain flexibility** for users to choose their preferred method

The approach prioritizes:
- ✅ Quick, simple, automated (Plaid)
- ✅ Reasonable defaults (daily sync, smart categorization)
- ✅ User-friendly (minimal friction, clear errors)
- ✅ Proactive (background sync, automatic recovery)
- ✅ Privacy-focused (local-first, optional cloud)
- ✅ Future-proof (provider abstraction, migration path)

**Next Steps**: Proceed to implementation Phase 1B.
