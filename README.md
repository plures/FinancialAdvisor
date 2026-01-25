# Financial Advisor 💰

[![CI/CD Status](https://github.com/plures/FinancialAdvisor/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/ci.yml)
[![Security Scan](https://github.com/plures/FinancialAdvisor/workflows/Security%20Scanning/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/package-json/v/plures/FinancialAdvisor)](https://github.com/plures/FinancialAdvisor/releases)

> **Personal AI-Powered Financial Advisor** - A multiplatform desktop application for managing your finances with AI assistance, built with Tauri, Svelte, Praxis, and PluresDB.

## 🎯 Overview

FinancialAdvisor is a modern personal finance management system that combines:

- **Tauri Desktop App** - Cross-platform desktop application (Windows, macOS, Linux)
- **SvelteKit UI** - Modern, reactive user interface with Svelte 5
- **Praxis Framework** - Schema-driven application logic and business rules
- **PluresDB** - Local-first data storage with real-time sync and vector storage for AI
- **AI Integration** - Support for multiple AI providers (OpenAI, Ollama, etc.)
- **MCP Protocol** - Model Context Protocol for AI agent integration

## 🏗️ Architecture

```text
FinancialAdvisor/
├── 📱 src/                      # SvelteKit frontend application
│   ├── routes/                  # Application pages
│   │   ├── accounts/           # Account management
│   │   ├── transactions/       # Transaction tracking
│   │   ├── reports/            # Financial reports
│   │   └── settings/           # App settings
│   └── lib/                    # Shared libraries
│       ├── praxis/             # Praxis schema & logic
│       ├── pluresdb/           # PluresDB integration
│       ├── stores/             # Svelte stores
│       └── components/         # Reusable components
├── 🦀 src-tauri/               # Tauri Rust backend
│   ├── src/                    # Rust source code
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── 📦 packages/                # Legacy packages (being migrated)
│   ├── shared/                 # Common types and utilities
│   ├── financial-tools/        # Core financial calculations
│   ├── ai-integration/         # AI provider abstractions
│   └── mcp-server/             # MCP server implementation
└── 📚 docs/                    # Documentation
```

## ✨ Features

### 🏦 Financial Management

- **Account Tracking** - Monitor multiple accounts (checking, savings, investment, etc.)
- **Transaction Management** - Add and categorize transactions
- **Budget Planning** - Create and track budgets (coming soon)
- **Goal Setting** - Set and monitor financial goals (coming soon)
- **Investment Analysis** - Portfolio tracking (coming soon)

### 🤖 AI-Powered Insights (Phase 3 & 4)

- **Multi-Provider AI Support** - Microsoft Copilot (recommended), OpenAI, Ollama, or custom providers
- **Autonomous Financial Planning** - AI agents create comprehensive financial plans
- **Smart Categorization** - Automatic transaction categorization with learning
- **Proactive Assessments** - Continuous AI-driven financial health monitoring
- **What-If Planning** - AI-powered scenario analysis and predictions
- **Creative Solutions** - Innovative AI-generated strategies to achieve goals
- **Budget Optimization** - AI-recommended budgets based on goals and behavior
- **Learning System** - Improves from user corrections and manual categorizations

**Phase 4 Advanced Features:**
- **Predictive Analytics** - Spending trends, forecasts, and anomaly detection
- **Enhanced AI Accuracy** - Confidence scoring, response validation, and intelligent caching
- **Performance Optimizations** - Batch processing, rate limiting, and connection pooling
- **Production Monitoring** - Health checks, metrics collection, and error tracking

See [Phase 3 Documentation](docs/PHASE3_IMPLEMENTATION.md) and [Phase 4 Documentation](docs/PHASE4_IMPLEMENTATION.md) for detailed features and setup.

### 🤖 Legacy AI Features

- **Spending Analysis** - AI-powered spending pattern recognition
- **Financial Advice** - Personalized recommendations based on your data
- **Report Generation** - Automated financial reports with insights

### 🔐 Security & Privacy

- **Local-First Storage** - All data stored locally using PluresDB
- **No Cloud Dependencies** - Complete offline operation capability
- **Data Encryption** - Secure storage of sensitive information
- **Vector Storage** - AI embeddings stored locally for privacy

### 🔌 Extensibility

- **Praxis Schema** - Declarative data models and business rules
- **AI Provider Choice** - Microsoft Copilot (preferred), OpenAI, Anthropic, Ollama, and custom providers
- **MCP Protocol** - Standard Model Context Protocol for AI integration (future-ready)
- **Multiplatform** - Desktop support for Windows, macOS, and Linux; Mobile support for iOS and Android


## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (22+ recommended)
- **Rust** - Install from [rustup.rs](https://rustup.rs/)
- **Platform-specific dependencies**:
  - **Windows**: Visual Studio with C++ tools, WebView2
  - **macOS**: Xcode Command Line Tools
  - **Linux**: Build essentials, webkit2gtk-4.1, libssl-dev

### Installation

```bash
# Clone the repository
git clone https://github.com/plures/FinancialAdvisor.git
cd FinancialAdvisor

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## 🛠️ Development

### Setup Development Environment

```bash
# One-command setup
make bootstrap

# Or manually:
npm install
npm run setup:hooks
npm run build
npm run test
```

### Available Commands

```bash
# Development
make build          # Build the project
make watch          # Watch for changes
make test           # Run all tests
make lint           # Run linting
make format         # Format code

# Quality checks
make check-all      # Run all quality checks
make coverage       # Generate coverage report
make audit          # Security audit

# Package & Release
make package        # Create VSIX package
make release-check  # Check release readiness
```

### Project Structure

```text
├── src/
│   ├── extension/          # VSCode extension code
│   │   ├── providers/      # Financial advice providers
│   │   └── mcp/           # MCP server integration
│   ├── mcp-server/        # MCP server implementation
│   └── shared/            # Shared types and utilities
├── test/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── .github/
│   ├── workflows/         # CI/CD pipelines
│   └── ISSUE_TEMPLATE/    # Issue templates
└── docs/                  # Documentation
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# With coverage
npm run coverage
```

### AI Integration Testing

The project includes comprehensive integration tests for AI providers (OpenAI, GitHub Copilot) that validate real API connections. These tests automatically skip when API keys are not available.

```bash
# Run AI integration tests with OpenAI API key
export OPENAI_API_KEY="sk-your-api-key-here"
npm run test:integration

# Tests will skip gracefully without API key
npm run test:integration  # Skips AI tests if no key
```

See [AI Integration Testing Guide](docs/AI_INTEGRATION_TESTING.md) for detailed documentation on:
- Setting up API keys for testing
- Running tests locally and in CI/CD
- Understanding test coverage
- Cost management and best practices
- Adding new AI integration tests

## 📦 Building & Packaging

```bash
# Build TypeScript
npm run build

# Package extension
npm run package

# Publish (requires tokens)
npm run publish
```

### Manual Installation

1. **Clone and Setup**

  ```bash
   git clone https://github.com/plures/FinancialAdvisor.git
   cd FinancialAdvisor
   npm install
   npm run build
   ```

1. **Install VSCode Extension**

  ```bash
   cd packages/vscode-extension
   npm run package
   code --install-extension financial-advisor-1.0.0.vsix
   ```

1. **Configure MCP Server**

  ```bash
   # Set data directory
   export FINANCIAL_ADVISOR_DATA_DIR="$HOME/.financial-advisor"
   
   # Optional: Set encryption key
   export FINANCIAL_ADVISOR_ENCRYPTION_KEY="your-secure-key"
   
   # Start MCP server
   npm run start --workspace=@financialadvisor/mcp-server
   ```

### First Steps

1. **Open VSCode** and activate the Financial Advisor extension
2. **Setup MCP Server** via Command Palette: `Financial Advisor: Setup MCP Server`
3. **Add Your First Account** using the dashboard or command: `Financial Advisor: Add Account`
4. **Import Transactions** or add them manually
5. **Configure AI Provider** for intelligent insights

## 📖 Documentation

### 📋 User Guide

#### Adding Financial Accounts

The Add Account feature allows you to register your financial accounts for tracking and analysis.

##### Via VS Code Extension

1. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. **Run Command**: `Financial Advisor: Add Account`
3. **Fill in the details** when prompted:
   - **Account Name**: A unique identifier for your account
   - **Account Type**: Choose from available types
   - **Current Balance**: Enter the current account balance
   - **Institution** (optional): Your bank or financial institution

##### Supported Account Types

- **`checking`** - Primary checking accounts
- **`savings`** - Savings accounts and money market accounts
- **`credit_card`** - Credit card accounts (balances can be negative)
- **`investment`** - Investment and brokerage accounts
- **`loan`** - Personal loans and lines of credit
- **`mortgage`** - Home mortgages and property loans
- **`retirement`** - 401(k), IRA, and other retirement accounts

##### Input Validation

The system validates your input to ensure data integrity:

- ✅ **Account names must be unique** - Duplicate names are not allowed
- ✅ **Required fields** - Name, type, and balance are mandatory
- ✅ **Valid account types** - Only predefined types are accepted
- ✅ **Numeric balance** - Balance must be a valid number (negative allowed for credit cards)
- ✅ **Whitespace handling** - Leading/trailing spaces are automatically trimmed

##### Examples

**Basic Checking Account:**
```
Name: "Primary Checking"
Type: checking
Balance: 2,500.75
Institution: "Bank of America"
```

**Credit Card (with negative balance):**
```
Name: "Chase Freedom"
Type: credit_card
Balance: -1,250.00
Institution: "Chase Bank"
```

**Investment Account:**
```
Name: "Fidelity 401k"
Type: retirement
Balance: 125,000.00
Institution: "Fidelity Investments"
```

##### Via MCP Server API

You can also add accounts programmatically via the MCP server:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "add_account",
    "arguments": {
      "name": "Savings Account",
      "type": "savings",
      "balance": 5000.00,
      "currency": "USD",
      "institution": "Local Credit Union"
    }
  }
}
```

### Package Documentation

#### 🔧 Shared Package (`@financialadvisor/shared`)

Common types, interfaces, and utilities used across all packages.

```typescript
import { Account, Transaction, formatCurrency } from '@financialadvisor/shared';

const account: Account = {
  id: 'acc-1',
  name: 'Checking Account',
  type: AccountType.CHECKING,
  balance: 1500.00,
  currency: 'USD',
  lastUpdated: new Date(),
  isActive: true
};

console.log(formatCurrency(account.balance)); // $1,500.00
```

#### 🧮 Financial Tools (`@financialadvisor/financial-tools`)

Core financial calculations and analysis tools.

```typescript
import { BudgetCalculator, TransactionAnalyzer } from '@financialadvisor/financial-tools';

// Analyze spending patterns
const insights = TransactionAnalyzer.analyzeTransactions(transactions, timeframe);
console.log(`Savings rate: ${insights.savingsRate.toFixed(1)}%`);

// Budget analysis
const budgetAnalysis = BudgetCalculator.analyzeBudget(budget, transactions);
console.log(`Budget used: ${budgetAnalysis.percentageUsed.toFixed(1)}%`);
```

#### 🤖 AI Integration (`@financialadvisor/ai-integration`)

AI provider abstractions for financial analysis.

```typescript
import { AIProviderFactory, AIProviderType } from '@financialadvisor/ai-integration';

// OpenAI provider
const provider = AIProviderFactory.createProvider(AIProviderType.OPENAI, {
  apiKey: 'your-api-key',
  model: 'gpt-4'
});

// Analyze financial data
const response = await provider.analyzeFinancialData(context, {
  type: 'analysis',
  prompt: 'What are my spending patterns?'
});
```

#### 🔐 MCP Server (`@financialadvisor/mcp-server`)

Secure local storage with MCP protocol support.

```typescript
import { FinancialAdvisorMCPServer } from '@financialadvisor/mcp-server';

const server = new FinancialAdvisorMCPServer({
  dbPath: './financial.db',
  encryptionKey: 'your-encryption-key',
  backupEnabled: true
});

await server.run();
```

### VSCode Extension

The VSCode extension provides a complete UI for managing your financial data:

#### Commands

- `Financial Advisor: Open Dashboard` - Main financial dashboard
- `Financial Advisor: Add Transaction` - Quick transaction entry
- `Financial Advisor: Add Account` - Account management
- `Financial Advisor: Analyze Spending` - AI-powered spending analysis
- `Financial Advisor: Generate Report` - Custom financial reports
- `Financial Advisor: Configure AI` - AI provider setup

#### Views

- **Accounts View** - List and manage all accounts
- **Transactions View** - Recent transaction history
- **Budgets View** - Budget tracking and alerts
- **Goals View** - Financial goal monitoring

#### Dashboard Features

- Real-time account balances
- Transaction categorization
- Spending analysis charts
- Budget progress indicators
- Goal tracking widgets

## 🔧 Configuration

### Network Configuration (CI/CD)

For organizations using IP allow lists or self-hosted runners, network access must be configured to allow connections to external services like the OpenAI API. See the [Network Configuration Guide](docs/guides/network-configuration.md) for detailed setup instructions.

**Quick reference:**
- OpenAI API: `api.openai.com:443` (required for AI features)
- NPM Registry: `registry.npmjs.org:443` (required for package installation)
- See [`.github/network-policy.yml`](.github/network-policy.yml) for complete network policy

### MCP Server Configuration

Create a `.financial-advisor-config.json` file:

```json
{
  "aiModel": {
    "provider": "local",
    "model": "llama3",
    "endpoint": "http://localhost:11434"
  },
  "privacy": {
    "localOnly": true,
    "encryptData": true
  },
  "features": {
    "budgetTracking": true,
    "investmentAdvice": true,
    "goalSetting": true
  }
}
```

### VS Code Settings

```json
{
  "financialAdvisor.autoStart": true,
  "financialAdvisor.notifications": true,
  "financialAdvisor.dataPath": "./financial-data"
}
```

### Quick MCP setup (Windows PowerShell)

- In VS Code, open Settings (Ctrl+,) and set:
  - financialAdvisor.mcpServer.dataDir → e.g., C:\\Users\\YOUR_USER\\.financial-advisor
  - financialAdvisor.mcpServer.path → optional full path to financial-advisor-mcp if it’s not on PATH

- Or add to your .vscode/settings.json:

```jsonc
{
  "financialAdvisor.mcpServer.dataDir": "C:\\Users\\YOUR_USER\\.financial-advisor",
  "financialAdvisor.security.encryptionEnabled": true
}
```

- Optional: start the MCP server manually for troubleshooting:

```powershell
# If installed globally or available on PATH
financial-advisor-mcp

# Or from the package (after building the monorepo)
pwsh -NoProfile -Command "npm run build:all:win; cd packages/mcp-server; node dist/cli.js"
```

## 🔒 Security & Privacy

- **Local-First**: Financial data never leaves your machine by default
- **Encryption**: Sensitive data is encrypted at rest
- **Audit Trail**: All operations are logged for transparency
- **No Telemetry**: No usage data is collected without explicit consent

### Security Features

- 🔐 End-to-end encryption for financial data
- 🛡️ Regular security scans (CodeQL, OSV)
- 🔍 Dependency vulnerability monitoring
- 📋 SBOM generation for supply chain transparency

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Run quality checks: `make check-all`
5. Commit changes: `git commit -m 'feat: add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESLint + Prettier for formatting
- Conventional Commits for commit messages
- 80%+ test coverage requirement

## 📚 Docs & Guides

- [API Documentation](docs/api.md)
- [Architecture Decisions](docs/adr/)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)
- [Security Guide](docs/security.md)
- [Network Configuration Guide](docs/guides/network-configuration.md) - Firewall and network setup for CI/CD
- [Account Integration Guide](docs/ACCOUNT_INTEGRATION.md) - Automated account synchronization with Plaid
- [Plaid Integration Plan](docs/PLAID_INTEGRATION_PLAN.md) - Detailed implementation roadmap

## 🗺️ Roadmap

**Current Status: Phase 4 In Progress 🔄**

- ✅ **Phase 1:** Core functionality and data management
- ✅ **Phase 2:** UI, budgets, goals, and advanced reporting
- ✅ **Phase 3:** AI-driven automation and intelligent financial planning
  - Microsoft Copilot integration
  - Multi-provider AI support (OpenAI, Ollama, local AI)
  - Autonomous financial planning agents
  - AI-powered categorization and learning
  - Proactive financial assessments
  - What-if scenario planning
  - Creative financial solutions engine
- 🔄 **Phase 4:** Advanced analytics and production readiness (IN PROGRESS)
  - ✅ Predictive analytics (spending trends, forecasts, anomaly detection)
  - ✅ Enhanced AI accuracy (confidence scoring, validation, caching)
  - ✅ Performance optimizations (batching, rate limiting, connection pooling)
  - ✅ Production monitoring (health checks, metrics, error tracking)
  - ⏳ Actual Microsoft Copilot API integration
  - ⏳ Production deployment preparation
- 🔜 **Phase 5:** Bank integrations and real-time data (Future)
  - ⏳ Plaid automated account integration (In Planning)
  - Account connection via Plaid Link
  - Automatic transaction synchronization
  - Balance updates and reconciliation
  - Migration path to Open Bank Project for self-hosting

See [docs/ROADMAP.md](docs/ROADMAP.md) for the complete plan, [docs/PHASE3_IMPLEMENTATION.md](docs/PHASE3_IMPLEMENTATION.md) for Phase 3 details, and [docs/PHASE4_IMPLEMENTATION.md](docs/PHASE4_IMPLEMENTATION.md) for Phase 4 features.

## 📊 Metrics & Analytics

- Code Coverage: ![codecov](https://codecov.io/gh/plures/FinancialAdvisor/branch/main/graph/badge.svg)
- Build Status: [![CI](https://github.com/plures/FinancialAdvisor/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/plures/FinancialAdvisor/actions)
- Security Score: [![Security](https://github.com/plures/FinancialAdvisor/workflows/Security%20Scanning/badge.svg)](https://github.com/plures/FinancialAdvisor/actions)

## 🆘 Support

- 📋 [Issues](https://github.com/plures/FinancialAdvisor/issues)
- 💬 [Discussions](https://github.com/plures/FinancialAdvisor/discussions)
- 📧 Email: [support@financial-advisor.dev](mailto:support@financial-advisor.dev)
- 📚 [Documentation](https://docs.financial-advisor.dev)
 