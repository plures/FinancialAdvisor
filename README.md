# Financial Advisor 💰

[![CI/CD Status](https://github.com/plures/FinancialAdvisor/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/ci.yml)
[![Security Scan](https://github.com/plures/FinancialAdvisor/workflows/Security%20Scanning/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=plures.financial-advisor)
[![Version](https://img.shields.io/github/package-json/v/plures/FinancialAdvisor)](https://github.com/plures/FinancialAdvisor/releases)
[![codecov](https://codecov.io/gh/plures/FinancialAdvisor/branch/main/graph/badge.svg)](https://codecov.io/gh/plures/FinancialAdvisor)

> **Personal AI-Powered Financial Advisor** - A comprehensive monorepo for managing your finances with AI assistance, secure local storage, and extensible architecture.

## 🎯 Overview

FinancialAdvisor is a complete personal finance management system that combines:

- **VSCode Extension** for intuitive financial data management
- **MCP Server** for secure local storage of financial data
- **AI Integration** supporting multiple providers (OpenAI, Ollama, etc.)
- **Financial Tools** for analysis, categorization, and planning
- **Extensible Architecture** for custom plugins and integrations

## 🏗️ Architecture

```text
FinancialAdvisor/
├── 📦 packages/
│   ├── 🔧 shared/              # Common types and utilities
│   ├── 🧮 financial-tools/     # Core financial calculations
│   ├── 🤖 ai-integration/      # AI provider abstractions
│   ├── 🔐 mcp-server/          # Secure data storage server
│   └── 🖥️ vscode-extension/    # VSCode interface
├── 📚 docs/                    # Documentation
├── 🛠️ scripts/                # Build and utility scripts
└── 📊 apps/                    # Demo applications
```

## ✨ Features

### 🏦 Financial Management

- **Account Tracking** - Monitor multiple accounts (checking, savings, investment, etc.)
- **Transaction Management** - Automatic categorization and analysis
- **Budget Planning** - Create and track budgets with overspend alerts
- **Goal Setting** - Set and monitor financial goals with progress tracking
- **Investment Analysis** - Portfolio diversification and performance tracking

### 🤖 AI-Powered Insights

- **Smart Categorization** - Automatic transaction categorization
- **Spending Analysis** - AI-powered spending pattern recognition
- **Financial Advice** - Personalized recommendations based on your data
- **Report Generation** - Automated financial reports with insights

### 🔐 Security & Privacy

- **Local Storage** - All data stored locally with optional encryption
- **Password Management** - Secure credential storage for financial accounts
- **Data Encryption** - AES encryption for sensitive information
- **No Cloud Dependencies** - Complete offline operation capability

### 🔌 Extensibility

- **Plugin System** - Custom extensions for specific financial needs
- **AI Provider Choice** - Support for OpenAI, Anthropic, Ollama, and custom providers
- **MCP Protocol** - Standard Model Context Protocol for AI integration
- **API Access** - RESTful API for custom integrations


## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- VS Code 1.85+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/plures/FinancialAdvisor.git
cd FinancialAdvisor

# Install dependencies and setup
npm run bootstrap

# Package the extension
npm run package
```

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Financial Advisor"
4. Click Install

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

## 🗺️ Roadmap

See docs/ROADMAP.md for the prioritized MVP and 1.0.0 plan.

## 📊 Metrics & Analytics

- Code Coverage: ![codecov](https://codecov.io/gh/plures/FinancialAdvisor/branch/main/graph/badge.svg)
- Build Status: [![CI](https://github.com/plures/FinancialAdvisor/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/plures/FinancialAdvisor/actions)
- Security Score: [![Security](https://github.com/plures/FinancialAdvisor/workflows/Security%20Scanning/badge.svg)](https://github.com/plures/FinancialAdvisor/actions)

## 🆘 Support

- 📋 [Issues](https://github.com/plures/FinancialAdvisor/issues)
- 💬 [Discussions](https://github.com/plures/FinancialAdvisor/discussions)
- 📧 Email: [support@financial-advisor.dev](mailto:support@financial-advisor.dev)
- 📚 [Documentation](https://docs.financial-advisor.dev)
 