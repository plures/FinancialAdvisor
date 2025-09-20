# FinancialAdvisor

> **Personal AI-Powered Financial Advisor** - A comprehensive monorepo for managing your finances with AI assistance, secure local storage, and extensible architecture.

## 🎯 Overview

FinancialAdvisor is a complete personal finance management system that combines:
- **VSCode Extension** for intuitive financial data management
- **MCP Server** for secure local storage of financial data
- **AI Integration** supporting multiple providers (OpenAI, Ollama, etc.)
- **Financial Tools** for analysis, categorization, and planning
- **Extensible Architecture** for custom plugins and integrations

## 🏗️ Architecture

```
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
- Node.js 18+ and npm 9+
- VSCode 1.74+
- (Optional) Ollama for local AI models

### Installation

1. **Clone and Setup**
   ```bash
   git clone https://github.com/plures/FinancialAdvisor.git
   cd FinancialAdvisor
   npm install
   npm run build
   ```

2. **Install VSCode Extension**
   ```bash
   cd packages/vscode-extension
   npm run package
   code --install-extension financial-advisor-1.0.0.vsix
   ```

3. **Configure MCP Server**
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

```bash
# Environment Variables
FINANCIAL_ADVISOR_DATA_DIR="/path/to/data"        # Data storage location
FINANCIAL_ADVISOR_ENCRYPTION_KEY="secure-key"     # Encryption key
```

### VSCode Extension Settings

```json
{
  "financialAdvisor.mcpServer.dataDir": "/path/to/data",
  "financialAdvisor.ai.provider": "openai",
  "financialAdvisor.ai.model": "gpt-4",
  "financialAdvisor.ai.apiKey": "your-api-key",
  "financialAdvisor.security.encryptionEnabled": true
}
```

### AI Provider Setup

#### OpenAI
```json
{
  "financialAdvisor.ai.provider": "openai",
  "financialAdvisor.ai.model": "gpt-4",
  "financialAdvisor.ai.apiKey": "sk-..."
}
```

#### Ollama (Local)
```json
{
  "financialAdvisor.ai.provider": "ollama",
  "financialAdvisor.ai.model": "llama2",
  "financialAdvisor.ai.baseUrl": "http://localhost:11434"
}
```

## 🔌 API Reference

### MCP Server Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `add_account` | Add new financial account | `name`, `type`, `balance`, `currency`, `institution` |
| `add_transaction` | Add new transaction | `accountId`, `amount`, `description`, `category`, `merchant` |
| `analyze_spending` | Analyze spending patterns | `startDate`, `endDate`, `accountId` |
| `analyze_portfolio` | Investment portfolio analysis | `accountId` |
| `categorize_transactions` | Auto-categorize transactions | `limit` |

### MCP Server Resources

| Resource | Description | Format |
|----------|-------------|---------|
| `financial://accounts` | All account data | JSON |
| `financial://transactions` | Transaction history | JSON |
| `financial://budgets` | Budget information | JSON |
| `financial://goals` | Financial goals | JSON |
| `financial://investments` | Investment portfolio | JSON |

## 🛠️ Development

### Building the Project

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Watch mode for development
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific package tests
npm test --workspace=@financialadvisor/financial-tools
```

### Development Workflow

1. **Package Development** - Work on individual packages in isolation
2. **Integration Testing** - Test package interactions
3. **Extension Testing** - Test VSCode extension functionality
4. **MCP Server Testing** - Verify server operations

### Adding New Features

1. **Core Logic** - Implement in appropriate package (`financial-tools`, `shared`, etc.)
2. **MCP Integration** - Add tools/resources to MCP server
3. **UI Integration** - Update VSCode extension
4. **Documentation** - Update README and docs

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/FinancialAdvisor.git
cd FinancialAdvisor

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and test
npm run build && npm test

# Submit a pull request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/plures/FinancialAdvisor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/plures/FinancialAdvisor/discussions)

## 🗺️ Roadmap

- [ ] **Web Dashboard** - Browser-based financial dashboard
- [ ] **Mobile App** - React Native mobile application
- [ ] **Bank Integration** - Direct bank account connections
- [ ] **Investment Tracking** - Real-time stock price updates
- [ ] **Tax Reporting** - Automated tax document generation
- [ ] **Multi-Currency** - Enhanced multi-currency support
- [ ] **Collaborative Features** - Family financial planning
- [ ] **Advanced AI** - More sophisticated financial AI models

---

**Made with ❤️ for better financial health**
