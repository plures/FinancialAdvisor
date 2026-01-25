# ADR 004: Account Integration Strategy

**Date**: 2026-01-25  
**Status**: Accepted  
**Decision Makers**: Development Team  
**Related**: ADR-001 (MCP Integration), ADR-003 (Privacy by Design)

## Context

FinancialAdvisor needs automated account synchronization to compete with industry tools like Quicken, TurboTax, and RocketMoney. Users should be able to easily connect their financial accounts and keep them synchronized with minimal effort.

### Requirements

1. **Quick and Simple**: Fast integration with minimal user friction
2. **Automated**: Background synchronization without manual intervention
3. **Reasonable Defaults**: Work out-of-the-box with sensible configuration
4. **User-Friendly**: Clear error messages and proactive problem resolution
5. **Privacy-Focused**: Local-first data storage, minimal third-party access
6. **Cost-Effective**: Free or low-cost at scale
7. **Reliable**: Proven technology with good institutional coverage

### Options Considered

#### Option 1: Plaid API

**Pros**:
- Industry standard used by Venmo, Robinhood, Acorns
- 12,000+ institution coverage in North America
- Excellent developer experience (SDKs, documentation)
- Proven security (SOC 2 Type II certified)
- Plaid Link provides familiar, trusted UI
- Free tier for development (200 API calls)
- Fast time to market (days, not months)

**Cons**:
- Paid service at scale (~$0.30-0.60/account/month)
- Third-party data access (privacy concern)
- Vendor lock-in risk
- Usage limits on free tier
- Primarily North America focused

**Cost at Scale**:
- 1,000 users × 2 accounts × $0.45/month = ~$900/month
- Breaks even with self-hosted at ~200-500 accounts

#### Option 2: Open Bank Project (OBP)

**Pros**:
- Truly open source (AGPL license)
- Self-hosted with full control
- No per-account fees or usage limits
- Complete data privacy (no third-party access)
- 350+ RESTful APIs
- Global coverage through connector system
- Active development community

**Cons**:
- Higher initial setup complexity
- Requires infrastructure (server, database, maintenance)
- Smaller institution coverage than Plaid
- Manual connector configuration per bank
- No pre-built UI like Plaid Link
- Longer time to market (weeks to months)

**Cost**:
- Infrastructure: ~$50-200/month (VPS + database)
- Development: 4-6 weeks initial setup
- Maintenance: 2-4 hours/week
- Break-even: ~200-500 accounts

#### Option 3: Build Custom Scrapers

**Pros**:
- Complete control
- No third-party dependencies
- Truly free

**Cons**:
- Extremely high development cost (months of work)
- Fragile (breaks when banks change websites)
- Legal/ToS risks
- Unreliable
- High maintenance burden
- Security risks

**Decision**: Not viable - reinventing the wheel poorly.

#### Option 4: Nordigen (GoCardless)

**Pros**:
- Free for European banks
- PSD2/Open Banking compliant
- Good EU/UK coverage

**Cons**:
- Europe-only (limited North America)
- Commercial support model
- Less control than OBP

**Decision**: Not suitable for primary North American market.

## Decision

**We will implement a hybrid approach**:

### Phase 1: Start with Plaid (Immediate)

Use Plaid as the initial integration provider to achieve fast time-to-market while learning user needs.

**Rationale**:
1. **User Experience First**: Plaid Link provides the best UX - familiar, trusted, simple
2. **Fast MVP**: Can ship in 1-2 weeks vs. 4-6+ weeks for OBP
3. **Validate Market**: Learn what users actually need before investing in self-hosting
4. **Low Risk**: Free tier supports initial development and testing
5. **Proven Technology**: Reduce technical risk with battle-tested solution

### Phase 2: Abstract Provider Interface

Implement provider abstraction from day one to avoid lock-in.

**Architecture**:
```typescript
interface IAccountProvider {
  getName(): string;
  createLinkToken(userId: string): Promise<string>;
  exchangeToken(publicToken: string): Promise<TokenResponse>;
  getAccounts(accessToken: string): Promise<ExternalAccount[]>;
  getTransactions(...): Promise<ExternalTransaction[]>;
  getBalances(...): Promise<AccountBalance>;
  removeConnection(accessToken: string): Promise<void>;
}

class PlaidProvider implements IAccountProvider { ... }
class OBPProvider implements IAccountProvider { ... }  // Future
```

**Benefits**:
- Easy provider switching
- User choice of integration method
- Testing flexibility
- No vendor lock-in

### Phase 3: Migrate to OBP (Future)

Implement Open Bank Project integration when usage justifies the investment.

**Triggers for Migration**:
- 200+ connected accounts (approaching Plaid cost threshold)
- User demand for self-hosting
- Privacy concerns from user base
- Desire for full data control

**Migration Path**:
1. Implement OBPProvider
2. Deploy OBP server (Docker)
3. Build migration tool
4. Offer user choice: Plaid vs. OBP
5. Gradually migrate users
6. Optional: Deprecate Plaid for cost savings

## Implementation Details

### Phase 1A: Foundation (Week 1)

- [x] Document architecture and plan
- [ ] Set up Plaid developer account
- [ ] Define provider interface
- [ ] Create type definitions
- [ ] Design database schema

### Phase 1B: Backend (Week 2)

- [ ] Implement PlaidProvider
- [ ] Create TokenStorageService with encryption
- [ ] Add MCP server tools
- [ ] Database migrations

### Phase 1C: Frontend (Week 3)

- [ ] Integrate Plaid Link in UI
- [ ] VSCode extension commands
- [ ] Sync status display
- [ ] Error notifications

### Phase 1D: Synchronization (Week 4)

- [ ] AccountSyncService
- [ ] Background sync scheduler
- [ ] Deduplication logic
- [ ] Conflict resolution

### Phase 1E: Testing & Docs (Week 5)

- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] User documentation
- [ ] Security audit

### Phase 2: OBP (Q2 2026)

- [ ] OBP server deployment guide
- [ ] OBPProvider implementation
- [ ] Migration tool
- [ ] User choice UI

## Consequences

### Positive

1. **Fast Time to Market**: Ship in 1-2 weeks instead of months
2. **Proven UX**: Leverage Plaid's trusted user interface
3. **Low Initial Risk**: Free tier supports MVP validation
4. **Flexibility**: Provider abstraction enables future migration
5. **User Choice**: Eventually offer Plaid vs. OBP options
6. **Privacy Path**: Clear migration to self-hosted solution

### Negative

1. **Short-term Cost**: Paid service after free tier exhausted
2. **Third-party Dependency**: Reliance on Plaid service
3. **Data Privacy**: User data passes through Plaid
4. **Vendor Lock-in Risk**: Mitigated by abstraction layer
5. **Migration Work**: Need to implement OBP eventually

### Neutral

1. **Two Implementations**: Need to maintain multiple providers
2. **Abstraction Overhead**: Additional complexity vs. direct integration
3. **Testing Burden**: Test against multiple provider implementations

## Trade-offs

We are explicitly choosing:

- **Speed over cost**: Fast MVP justifies initial Plaid costs
- **UX over privacy**: Plaid Link UX better than custom UI initially
- **Pragmatism over purity**: Start with commercial service, migrate to open source
- **Flexibility over simplicity**: Provider abstraction adds complexity but enables choice

## Privacy Considerations

Per ADR-003 (Privacy by Design):

### With Plaid

- User data flows through Plaid servers
- Plaid has access to account credentials and transactions
- Encrypted in transit and at rest
- SOC 2 Type II certified
- Clear in documentation and consent flow

### Mitigation

1. Explicit user consent with clear privacy policy
2. Local-first storage - Plaid only used for sync
3. Offer OBP alternative for privacy-conscious users
4. Document migration path in setup
5. Make privacy implications clear in UI

### With OBP (Future)

- All data stays on user's server or local machine
- No third-party access to credentials or transactions
- Full user control over infrastructure
- Self-hosted deployment option

## Alignment with Project Principles

### Quick, Simple, Automated ✅

- Plaid Link: 3-click account connection
- Auto-sync: Daily background updates
- Smart defaults: Reasonable configuration out-of-box

### Reasonable Defaults ✅

- Daily sync frequency
- Auto-import transactions
- Prefer external data for conflicts
- Notify on errors only

### Proactive Solutions ✅

- Automatic retry on transient errors
- User-friendly error messages with next steps
- Token refresh before expiration
- Deduplication prevents duplicates

### Privacy by Design ✅

- Local-first storage
- Encrypted token storage
- Clear migration path to self-hosted
- User choice of provider

### Prefer Open Source ✅

- Plan migration to Open Bank Project
- Provider abstraction enables choice
- Document self-hosting path
- Build migration tools

## Success Metrics

### Phase 1 (Plaid MVP)

- ✅ Account connection success rate >95%
- ✅ Sync completion rate >98%
- ✅ Average connection time <60 seconds
- ✅ Error recovery rate >90%
- ✅ User satisfaction score >4/5

### Phase 2 (OBP)

- ✅ Self-hosted deployment in <2 hours
- ✅ Migration success rate >99%
- ✅ Cost per account <$0.10/month
- ✅ Institution coverage >1,000 banks
- ✅ Sync reliability parity with Plaid

## Related Decisions

- **ADR-001**: MCP integration enables clean provider abstraction
- **ADR-003**: Privacy by design drives OBP migration plan
- **Future ADR**: May need decision on webhook vs. polling sync strategy

## References

- [Plaid Documentation](https://plaid.com/docs/)
- [Open Bank Project](https://www.openbankproject.com/)
- [PLAID_INTEGRATION_PLAN.md](../PLAID_INTEGRATION_PLAN.md)
- [ACCOUNT_INTEGRATION.md](../ACCOUNT_INTEGRATION.md)

## Review Schedule

- **Initial Review**: After Phase 1E completion
- **Cost Review**: Monthly during Plaid usage
- **Migration Review**: At 200 connected accounts or Q2 2026
- **Annual Review**: Reassess provider strategy

## Appendix A: Cost Projections

### Scenario 1: Small User Base (100 users, 200 accounts)

- Plaid: $90-120/month
- OBP: $50-100/month (server) + setup time
- **Decision**: Stay with Plaid (simpler)

### Scenario 2: Medium User Base (500 users, 1,000 accounts)

- Plaid: $450-600/month
- OBP: $75-150/month (server) + maintenance
- **Decision**: Migrate to OBP (cost savings justify effort)

### Scenario 3: Large User Base (2,000 users, 4,000 accounts)

- Plaid: $1,800-2,400/month
- OBP: $100-200/month (scaled server) + maintenance
- **Decision**: Definitely OBP (massive savings)

## Appendix B: Implementation Checklist

- [x] Document architecture
- [x] Create type definitions
- [ ] Plaid account setup
- [ ] Provider interface implementation
- [ ] Token encryption service
- [ ] Database schema
- [ ] MCP server tools
- [ ] Plaid Link integration
- [ ] Sync service
- [ ] Testing suite
- [ ] Documentation
- [ ] Security audit
- [ ] User acceptance testing
