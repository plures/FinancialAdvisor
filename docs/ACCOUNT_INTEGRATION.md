# Plaid Account Integration

This module provides automated account synchronization via Plaid and other providers for the FinancialAdvisor application.

## Overview

The account integration system allows users to:
- Connect financial accounts from 12,000+ institutions
- Automatically sync transactions and balances
- Keep account data up-to-date with minimal effort
- Switch between different integration providers

## Quick Start

### Prerequisites

1. **Plaid Account**: Sign up at [plaid.com/dashboard](https://dashboard.plaid.com/signup)
2. **API Credentials**: Get your Client ID and Secret from the dashboard
3. **Environment Setup**: Add credentials to environment variables

### Environment Variables

```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_secret_here
PLAID_ENV=sandbox  # or development, production

# Optional: Webhook URL for real-time updates
PLAID_WEBHOOK_URL=https://your-domain.com/webhooks/plaid

# Encryption key for storing access tokens
ACCOUNT_INTEGRATION_ENCRYPTION_KEY=your-32-char-encryption-key
```

### Installation

The integration is built into the FinancialAdvisor packages. No additional installation needed if you're using the main application.

For development:

```bash
# Install dependencies
npm install

# Build packages
npm run build
```

## Architecture

### Provider Pattern

The integration uses an abstraction pattern to support multiple providers:

```
IAccountProvider (Interface)
    ├── PlaidProvider (Plaid API implementation)
    ├── OBPProvider (Open Bank Project implementation) - Future
    └── ManualProvider (Manual entry fallback)
```

This allows:
- Easy switching between providers
- Testing with different backends
- Future extensibility
- User choice of provider

### Data Flow

```
User Action → VSCode Extension/UI
    ↓
MCP Server Tools (connect_account, sync_accounts)
    ↓
AccountIntegrationService
    ↓
Provider (PlaidProvider, OBPProvider, etc.)
    ↓
External API (Plaid Cloud, OBP Server, etc.)
    ↓
Bank/Institution
```

### Data Storage

```
PluresDB / SQLite
    ├── account_connections (connection metadata)
    ├── sync_history (sync operation logs)
    ├── encrypted_tokens (access tokens, encrypted)
    └── accounts + transactions (synced data)
```

## Usage

### Connecting an Account

#### Via VSCode Extension

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run: `Financial Advisor: Connect Account`
3. Select provider: `Plaid`
4. Complete authentication in Plaid Link modal
5. Select accounts to connect
6. Accounts appear in your account list

#### Via MCP Server

```typescript
// Create link token
const response = await mcpClient.callTool({
  name: 'connect_account',
  arguments: {
    provider: 'plaid'
  }
});

const linkToken = response.linkToken;

// User completes Plaid Link flow and gets public_token

// Exchange public token for access token (handled internally)
```

### Syncing Accounts

#### Automatic Sync

Accounts sync automatically based on configuration:
- **Daily** (default): Once per day at configured time
- **Hourly**: Every hour
- **Weekly**: Once per week
- **Manual**: Only when user triggers

#### Manual Sync

```typescript
// Sync all accounts
await mcpClient.callTool({
  name: 'sync_accounts',
  arguments: {}
});

// Sync specific account
await mcpClient.callTool({
  name: 'sync_accounts',
  arguments: {
    accountIds: ['account-id-123'],
    force: true  // Force even if recently synced
  }
});
```

### Checking Sync Status

```typescript
// Get status for all connections
const status = await mcpClient.callTool({
  name: 'get_sync_status',
  arguments: {}
});

// Get status for specific connection
const connectionStatus = await mcpClient.callTool({
  name: 'get_sync_status',
  arguments: {
    connectionId: 'connection-id-123'
  }
});
```

### Disconnecting an Account

```typescript
await mcpClient.callTool({
  name: 'disconnect_account',
  arguments: {
    connectionId: 'connection-id-123'
  }
});
```

## Configuration

### Sync Configuration

```typescript
{
  enabled: true,
  frequency: 'daily',
  autoImportTransactions: true,
  autoUpdateBalances: true,
  notifyOnSync: true,
  notifyOnError: true,
  deduplicationEnabled: true,
  conflictResolution: 'prefer-external',  // or 'prefer-local', 'ask'
  maxTransactionAge: 90,  // days
  batchSize: 100  // transactions per batch
}
```

### Conflict Resolution

When a transaction exists both manually and from sync:

- **prefer-external**: Use data from bank (default)
- **prefer-local**: Keep manual entry
- **ask**: Prompt user to choose

## Error Handling

### Common Errors

#### `ITEM_LOGIN_REQUIRED`

**Meaning**: Bank requires re-authentication
**Action**: Reconnect account via Plaid Link
**Frequency**: Every 90-180 days typically

#### `INSTITUTION_DOWN`

**Meaning**: Bank's systems are unavailable
**Action**: Wait and retry automatically
**Frequency**: Rare, usually resolves in hours

#### `RATE_LIMIT_EXCEEDED`

**Meaning**: Too many API requests
**Action**: Automatic retry with backoff
**Frequency**: Should not occur with proper rate limiting

### Error Recovery

The system automatically:
1. Retries transient errors with exponential backoff
2. Notifies users of persistent errors
3. Logs all errors for debugging
4. Maintains sync state across failures

## Security

### Token Storage

- Access tokens are encrypted using AES-256
- Encryption key stored in environment or system keyring
- Tokens never logged or exposed in plain text
- Automatic token rotation where supported

### Data Privacy

- All communication over HTTPS/TLS 1.3
- No data shared except with chosen provider
- Local-first storage by default
- Option to self-host with Open Bank Project

### Compliance

- **PCI DSS**: Not applicable (no card data stored)
- **GDPR**: Right to erasure, data export
- **CCPA**: Data disclosure, opt-out
- **SOC 2**: Plaid is SOC 2 Type II certified

## Testing

### Sandbox Mode

Plaid provides a sandbox environment with test credentials:

```
Bank: Plaid Sandbox
Username: user_good
Password: pass_good
```

### Test Accounts

The sandbox includes various test scenarios:
- `user_good` / `pass_good` - Successful connection
- `user_bad` / `pass_bad` - Invalid credentials
- `user_locked` / `pass_locked` - Locked account

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires Plaid credentials)
export PLAID_CLIENT_ID=test_client_id
export PLAID_SECRET=test_secret
npm run test:integration

# E2E tests
npm run test:e2e
```

## Troubleshooting

### Connection Issues

**Problem**: "Unable to connect to Plaid"
**Solutions**:
1. Check internet connection
2. Verify API credentials
3. Check Plaid status page
4. Review firewall settings

**Problem**: "Institution not found"
**Solutions**:
1. Verify institution is supported
2. Try searching by bank name
3. Check Plaid coverage list

### Sync Issues

**Problem**: "Sync failed - token expired"
**Solution**: Reconnect account via Plaid Link

**Problem**: "Duplicate transactions detected"
**Solution**: Enable deduplication in settings

**Problem**: "Transactions missing"
**Solutions**:
1. Check sync date range
2. Verify account permissions
3. Force full sync
4. Check Plaid transaction history

## Migration to Open Bank Project

For users who want full control and no usage fees:

### Why Migrate?

- Zero per-account costs
- Complete data privacy
- Self-hosted infrastructure
- No third-party dependencies

### Migration Steps

1. Set up OBP server (see OBP deployment guide)
2. Configure bank connectors
3. Use migration tool to copy data
4. Switch provider in settings
5. Verify sync working
6. Disconnect Plaid (optional)

### Cost Comparison

At scale (500+ accounts):
- **Plaid**: $150-300/month
- **OBP**: $50-100/month (server costs)
- **Savings**: ~$100-200/month

See [PLAID_INTEGRATION_PLAN.md](../../docs/PLAID_INTEGRATION_PLAN.md) for detailed migration guide.

## API Reference

### IAccountProvider

```typescript
interface IAccountProvider {
  getName(): string;
  createLinkToken(userId: string, options?: LinkOptions): Promise<string>;
  exchangeToken(publicToken: string): Promise<TokenResponse>;
  getAccounts(accessToken: string): Promise<ExternalAccount[]>;
  getTransactions(accessToken: string, accountId: string, startDate: Date, endDate: Date): Promise<ExternalTransaction[]>;
  getBalances(accessToken: string, accountId: string): Promise<AccountBalance>;
  removeConnection(accessToken: string): Promise<void>;
}
```

### PlaidProvider

Implementation of `IAccountProvider` for Plaid API.

```typescript
const provider = new PlaidProvider({
  clientId: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET,
  environment: 'sandbox'  // or 'development', 'production'
});
```

## Resources

### Official Documentation

- [Plaid Documentation](https://plaid.com/docs/)
- [Plaid API Reference](https://plaid.com/docs/api/)
- [Plaid Link Guide](https://plaid.com/docs/link/)

### Community

- [Plaid GitHub](https://github.com/plaid)
- [Plaid Quickstart Examples](https://github.com/plaid/quickstart)
- [Open Bank Project](https://www.openbankproject.com/)

### Support

- Plaid Support: [support@plaid.com](mailto:support@plaid.com)
- FinancialAdvisor Issues: [GitHub Issues](https://github.com/plures/FinancialAdvisor/issues)

## Roadmap

### Phase 1: Plaid Integration ✅ (Current)

- [x] Documentation and planning
- [ ] Plaid provider implementation
- [ ] MCP server tools
- [ ] VSCode extension commands
- [ ] Automatic sync service
- [ ] Testing and refinement

### Phase 2: Open Bank Project

- [ ] OBP server setup guide
- [ ] OBP provider implementation
- [ ] Migration tools
- [ ] Self-hosting documentation

### Phase 3: Advanced Features

- [ ] Investment account support
- [ ] Bill detection and tracking
- [ ] Credit card optimization
- [ ] Multi-currency support

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

Areas needing help:
- Bank-specific connectors for OBP
- Additional provider implementations
- Enhanced error handling
- Internationalization
- Testing coverage

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Changelog

### v0.1.0 (Current)

- Initial documentation
- Type definitions
- Architecture planning
- Plaid integration design

### Future Versions

- v0.2.0: Plaid provider implementation
- v0.3.0: Sync service and automation
- v0.4.0: Open Bank Project support
